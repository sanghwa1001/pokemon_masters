// ===================== pokemon_multiplayer.js (함께하기 — Firebase 연동) =====================
// 기존의 BroadcastChannel/localStorage 통신을 Firebase Realtime Database(RTDB) 기반으로 교체했습니다.
// 재접속 유예(presence 플래그 기반 60초 그레이스) 로직은 폐기하고, 턴/대기 제한시간 기반으로
// 교체했습니다(pokemon_battle.js가 mpStartDeadline/mpForceDisconnect를 씀).

const MP_CODE_LENGTH = 6;
const MP_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const battleModeMenuEl     = document.getElementById('battle-mode-menu');
const battleTogetherMenuEl = document.getElementById('battle-together-menu');
const battleSoloBtn        = document.getElementById('battle-solo-btn');
const battleTogetherBtn    = document.getElementById('battle-together-btn');
const battleModeBackBtn    = document.getElementById('battle-mode-back-btn');
const battleTogetherBackBtn = document.getElementById('battle-together-back-btn');
const mpCreateBtn          = document.getElementById('mp-create-btn');
const mpJoinBtn            = document.getElementById('mp-join-btn');
const mpLobbyModalEl       = document.getElementById('mp-lobby-modal');
const mpLobbyCloseBtn      = document.getElementById('mp-lobby-close-btn');
const mpLobbyCodeEl        = document.getElementById('mp-lobby-code');
const mpLobbyStatusEl      = document.getElementById('mp-lobby-status');
const mpJoinModalEl        = document.getElementById('mp-join-modal');
const mpJoinCloseBtn       = document.getElementById('mp-join-close-btn');
const mpJoinInputEl        = document.getElementById('mp-join-input');
const mpJoinSubmitBtn      = document.getElementById('mp-join-submit-btn');
const mpJoinFeedbackEl     = document.getElementById('mp-join-feedback');
const mpTogetherFeedbackEl = document.getElementById('mp-together-feedback');

// 전역 객체로 외부에서 접근
window.mp = { active: false, isHost: false, partnerId: null, roomCode: null };
window.mpInbox = [];
window.mpWaiters = [];
window.mpHandlers = {};
window.mpOnDisconnect = null;

let currentRoomRef = null;
let messagesRef = null;
let unsubscribeMessages = null;
let unsubscribeRoom = null;
let isRoomOwner = false;      // 내가 만든 방인지(대기 중에도 true) — 대기 중 정리 시 방 삭제 여부 판단용
let roomDisconnectOp = null;  // onDisconnect 핸들 — 방장이 끊기면(대기 중이든 매칭 후든) 방 전체를 삭제.
                               // 매칭 후 "연결은 있는데 응답 없음"은 이제 presence가 아니라
                               // pokemon_battle.js의 턴/대기 제한시간이 감지함(mpForceDisconnect 참고)

const MP_CLIENT_ID = Math.random().toString(36).slice(2) + Date.now().toString(36);

function getFirebaseRef(path) {
    if (!window.firebaseDb) return null;
    return window.firebaseRef(window.firebaseDb, path);
}

// ---------------- 메시지 큐 처리 ----------------
window.mpSend = function(type, data) {
    if (!window.mp.active || !messagesRef) return;
    const msg = { type, from: MP_CLIENT_ID, timestamp: Date.now() };
    if (data !== undefined) msg.data = data;
    window.firebasePush(messagesRef, msg).catch(e => console.error("Firebase send error", e));
}

window.mpOn = function(type, handler) { window.mpHandlers[type] = handler; }

window.mpWaitFor = function(type, cb) {
    const idx = window.mpInbox.findIndex(m => m.type === type);
    if (idx !== -1) {
        const [msg] = window.mpInbox.splice(idx, 1);
        cb(msg.data);
        return;
    }
    window.mpWaiters.push({ type, cb });
}

window.mpClearInbox = function() {
    window.mpInbox = window.mpInbox.filter(m => m.type === 'party');
    window.mpWaiters = [];
}

function mpHandleMessage(msg) {
    if (msg.from === MP_CLIENT_ID) return; // 내가 보낸 건 무시
    if (typeof msg.type !== 'string') return;
    
    if (msg.type === 'leave') {
        mpHandleRemoteGone();
        return;
    }

    if (window.mpHandlers[msg.type]) { window.mpHandlers[msg.type](msg.data); return; }
    
    const wi = window.mpWaiters.findIndex(w => w.type === msg.type);
    if (wi !== -1) {
        const [w] = window.mpWaiters.splice(wi, 1);
        w.cb(msg.data);
        return;
    }
    window.mpInbox.push({ type: msg.type, data: msg.data });
}

// ---------------- 방 관리 ----------------
function mpGenerateCode() {
    let code = '';
    for (let i = 0; i < MP_CODE_LENGTH; i++) {
        code += MP_CODE_ALPHABET[Math.floor(Math.random() * MP_CODE_ALPHABET.length)];
    }
    return code;
}

// ---------------- 대기 제한시간 타이머(UI 포함) ----------------
// 배틀 액션 선택/강제 교체/파티 선택/불러오기 신호 대기, 4곳 전부 이 하나의 타이머로 처리함
// (동시에 두 곳이 겹칠 일이 없으므로 공유해도 안전). 카운트다운 표시는 캐치 게임의
// #game-timer와 같은 MM:SS 스타일이고, 위치는 각 화면의 닫기(×) 버튼과 대칭.
// 서버 없이 각자 클라이언트가 자기 로컬 시계로 판정하는 구조라, 상대가 자기 제한시간이 끝나는
// "그 순간" 보낸 메시지가 아직 네트워크로 오는 중인데 내 쪽이 먼저 다 돼서 억울하게 끊기는
// 경우가 생길 수 있음 — 그걸 흡수하기 위한 여유(grace). 화면에 보이는 카운트다운은 그대로
// durationMs 기준으로 00:00까지 가고, 실제 처리(onTimeout)만 이만큼 더 늦게 실행함
// ※ 나중에 서버 로직(예: Cloud Functions 등)이 생겨서 "누구 시계가 먼저 끝나느냐" 경쟁 없이
// 서버 시계로 최종 판정하게 되면 이 여유값은 존재 이유가 없어짐 — 그때는 지우고 서버 판정을
// 그대로 따르는 구조로 바꿔야 함
const MP_NETWORK_GRACE_MS = 3000;
let mpDeadlineTimeout = null;
let mpDeadlineInterval = null;
let mpDeadlineEl = null;

function mpFormatCountdown(ms) {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

window.mpClearDeadlineTimer = function() {
    if (mpDeadlineTimeout) { clearTimeout(mpDeadlineTimeout); mpDeadlineTimeout = null; }
    if (mpDeadlineInterval) { clearInterval(mpDeadlineInterval); mpDeadlineInterval = null; }
    if (mpDeadlineEl) { mpDeadlineEl.classList.add('hidden'); mpDeadlineEl = null; }
}

// el 안에 남은 시간을 표시하며 durationMs 안에 mpClearDeadlineTimer()가 불리지 않으면
// onTimeout()을 실행함(el이 없으면 표시 없이 타이머만 동작)
window.mpStartDeadline = function(el, durationMs, onTimeout) {
    window.mpClearDeadlineTimer();
    mpDeadlineEl = el || null;
    const endAt = Date.now() + durationMs;
    if (mpDeadlineEl) {
        mpDeadlineEl.textContent = mpFormatCountdown(durationMs);
        mpDeadlineEl.classList.remove('hidden');
        mpDeadlineInterval = setInterval(() => {
            if (mpDeadlineEl) mpDeadlineEl.textContent = mpFormatCountdown(endAt - Date.now());
        }, 1000);
    }
    mpDeadlineTimeout = setTimeout(() => {
        mpDeadlineTimeout = null;
        window.mpClearDeadlineTimer();
        onTimeout();
    }, durationMs + MP_NETWORK_GRACE_MS);
}

function mpTeardown() {
    window.mp.active = false;
    window.mp.isHost = false;
    window.mp.partnerId = null;
    window.mp.roomCode = null;
    window.mpInbox = [];
    window.mpWaiters = [];
    window.mpClearDeadlineTimer();
    
    if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
    }
    if (unsubscribeRoom) {
        unsubscribeRoom();
        unsubscribeRoom = null;
    }
    
    // 등록해 둔 onDisconnect 해제 — 안 하면 나중에 탭을 닫을 때 이미 끝난 방(또는 다음 판의
    // 다른 방)에 뒤늦게 영향을 줄 수 있음
    if (roomDisconnectOp) {
        roomDisconnectOp.cancel().catch(() => {});
        roomDisconnectOp = null;
    }
    // 방장은 정리 시 방(메시지 포함)을 삭제해 DB에 찌꺼기가 쌓이지 않게 함. 매칭 후 상대가
    // 진짜 끊겼거나(하드 디스커넥트) 턴 제한시간 초과로 포기한 경우는 감지한 쪽이 먼저
    // mpForceDisconnect()에서 방을 지우므로, 방장이 아니어도 정리가 항상 이루어짐
    if (currentRoomRef && isRoomOwner) {
        window.firebaseRemove(currentRoomRef).catch(() => {});
    }
    isRoomOwner = false;
    currentRoomRef = null;
    messagesRef = null;
}

window.mpLeave = function() {
    window.mpSend('leave');
    mpTeardown();
}

function mpHandleRemoteGone() {
    if (!window.mp.active) return;
    mpTeardown();
    if (window.mpOnDisconnect) window.mpOnDisconnect();
}

// pokemon_battle.js가 "더는 상대를 기다릴 수 없다"고 판단했을 때(턴 액션/강제교체/파티선택/
// 불러오기 대기가 제한시간을 넘김) 호출함 — 하드 디스커넥트와 동일하게 방을 지우고 기존
// 끊김 처리 흐름(mpOnDisconnect)을 그대로 태움. 호스트/게스트 상관없이 감지한 쪽이 처리해서,
// 어느 쪽이 방장이든 방이 영원히 안 지워지고 남는 일이 없게 함
window.mpForceDisconnect = function() {
    if (!window.mp.active) return;
    if (currentRoomRef) window.firebaseRemove(currentRoomRef).catch(() => {});
    mpHandleRemoteGone();
}

// ---------------- UI 연결 및 이벤트 ----------------
function showStartSubmenu(which) {
    const startScreen = document.getElementById('start-screen');
    startScreen.classList.toggle('hidden', which !== null);
    battleModeMenuEl.classList.toggle('hidden', which !== 'mode');
    battleTogetherMenuEl.classList.toggle('hidden', which !== 'together');
}

battleSoloBtn.addEventListener('click', () => {
    showStartSubmenu(null);
    if(typeof openBattlePartyPicker === 'function') openBattlePartyPicker();
    else if (window.openBattlePartyPicker) window.openBattlePartyPicker();
});
battleTogetherBtn.addEventListener('click', () => {
    if (mpTogetherFeedbackEl) mpTogetherFeedbackEl.textContent = '';
    showStartSubmenu('together');
});
battleModeBackBtn.addEventListener('click', () => showStartSubmenu(null));
battleTogetherBackBtn.addEventListener('click', () => showStartSubmenu('mode'));
document.getElementById('battle-btn').addEventListener('click', () => showStartSubmenu('mode'));


mpCreateBtn.addEventListener('click', async () => {
    if (!window.firebaseDb) {
        if (mpTogetherFeedbackEl) mpTogetherFeedbackEl.textContent = '데이터베이스 초기화 중입니다. 잠시 후 다시 시도해주세요.';
        return;
    }
    if (mpTogetherFeedbackEl) mpTogetherFeedbackEl.textContent = '';
    
    const code = mpGenerateCode();
    mpLobbyCodeEl.textContent = code;
    mpLobbyStatusEl.innerHTML = '상대를 기다리는 중<span class="mp-dots"></span>';
    mpLobbyModalEl.classList.remove('hidden');
    
    currentRoomRef = getFirebaseRef(`rooms/${code}`);
    isRoomOwner = true;
    await window.firebaseSet(currentRoomRef, {
        host: MP_CLIENT_ID,
        status: 'waiting',
        timestamp: Date.now()
    });
    
    // onDisconnect 훅: 방장이 끊기면(대기 중이든 매칭 후든) 방 삭제
    roomDisconnectOp = window.firebaseOnDisconnect(currentRoomRef);
    roomDisconnectOp.remove();
    
    // 방 전체가 아니라 guest 값만 감시 — 방 전체를 감시하면 messages가 추가될 때마다
    // 콜백이 다시 불리고 메시지 전체를 매번 다시 내려받음
    unsubscribeRoom = window.firebaseOnValue(getFirebaseRef(`rooms/${code}/guest`), (snapshot) => {
        const guestId = snapshot.val();
        if (!guestId) {
            // 게임 중에 guest가 사라짐 = 방 자체가 삭제됨(상대의 하드 디스커넥트 또는 턴 제한시간
            // 초과로 상대 쪽이 먼저 정리한 경우) → 지연 없이 즉시 처리
            if (window.mp.active) mpHandleRemoteGone();
            return;
        }
        if (window.mp.active) return;
        // 연결됨!
        window.mp.active = true;
        window.mp.isHost = true;
        window.mp.partnerId = guestId;
        window.mp.roomCode = code;
        
        setupMessageListener(code);
        
        mpLobbyModalEl.classList.add('hidden');
        showStartSubmenu(null);
        if(window.openBattlePartyPicker) window.openBattlePartyPicker();
    });
});

mpJoinSubmitBtn.addEventListener('click', async () => {
    if (!window.firebaseDb) { mpJoinFeedbackEl.textContent = '데이터베이스 초기화 중입니다. 잠시 후 다시 시도해주세요.'; return; }
    const code = mpJoinInputEl.value.toUpperCase().trim();
    if (code.length !== MP_CODE_LENGTH) return;
    
    mpJoinFeedbackEl.textContent = '확인 중...';
    const roomRef = getFirebaseRef(`rooms/${code}`);
    
    const snapshot = await window.firebaseGet(roomRef);
    if (!snapshot.exists()) {
        mpJoinFeedbackEl.textContent = '유효하지 않은 코드입니다.';
        return;
    }
    
    const val = snapshot.val();
    if (val.status !== 'waiting') {
        mpJoinFeedbackEl.textContent = '이미 게임이 시작되었거나 닫힌 방입니다.';
        return;
    }
    
    // 입장! — 트랜잭션으로 처리해서 두 명이 동시에 같은 코드로 들어와도 한 명만 성공
    let joined = false;
    try {
        const result = await window.firebaseRunTransaction(roomRef, (room) => {
            // 로컬 캐시가 비어 첫 호출이 null로 올 수 있음 → null을 돌려주면 서버 값으로 재시도됨
            if (room === null) return null;
            if (room.status !== 'waiting' || room.guest) return; // 이미 찬 방 → 중단
            room.status = 'playing';
            room.guest = MP_CLIENT_ID;
            return room;
        });
        const after = result.snapshot.val();
        joined = result.committed && after && after.guest === MP_CLIENT_ID;
    } catch (e) {
        console.error('Firebase join error', e);
    }
    if (!joined) {
        mpJoinFeedbackEl.textContent = '이미 게임이 시작되었거나 닫힌 방입니다.';
        return;
    }
    
    // 게스트가 끊기면(대기 중이든 매칭 후든) 방 전체를 삭제
    roomDisconnectOp = window.firebaseOnDisconnect(roomRef);
    roomDisconnectOp.remove();
    
    window.mp.active = true;
    window.mp.isHost = false;
    window.mp.partnerId = val.host;
    window.mp.roomCode = code;
    
    currentRoomRef = roomRef;
    
    // 방 전체 대신 host 값만 감시(메시지마다 전체를 다시 받지 않도록) — 방이 삭제되면 null이 됨
    unsubscribeRoom = window.firebaseOnValue(getFirebaseRef(`rooms/${code}/host`), (snap) => {
        if (!snap.exists()) mpHandleRemoteGone();
    });
    
    setupMessageListener(code);
    
    mpJoinModalEl.classList.add('hidden');
    mpJoinInputEl.value = '';
    mpJoinFeedbackEl.textContent = '';
    showStartSubmenu(null);
    if(window.openBattlePartyPicker) window.openBattlePartyPicker();
});

mpLobbyCloseBtn.addEventListener('click', () => {
    mpLobbyModalEl.classList.add('hidden');
    mpTeardown(); // 방장(isRoomOwner)이므로 방 삭제 + onDisconnect 해제까지 처리됨
});

mpJoinBtn.addEventListener('click', () => {
    mpJoinModalEl.classList.remove('hidden');
    mpJoinInputEl.focus();
});
mpJoinCloseBtn.addEventListener('click', () => {
    mpJoinModalEl.classList.add('hidden');
    mpJoinFeedbackEl.textContent = '';
    mpJoinInputEl.value = '';
});

function setupMessageListener(code) {
    messagesRef = getFirebaseRef(`rooms/${code}/messages`);
    unsubscribeMessages = window.firebaseOnChildAdded(messagesRef, (snapshot) => {
        const msg = snapshot.val();
        if (msg) mpHandleMessage(msg);
    });
}



window.addEventListener('pagehide', () => {
    if (window.mp.active) window.mpLeave();
});
