// ===================== pokemon_multiplayer.js (함께하기 — Firebase 연동) =====================
// 기존의 BroadcastChannel/localStorage 통신을 Firebase Realtime Database(RTDB) 기반으로 교체했습니다.

const MP_CODE_LENGTH = 6;
const MP_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MP_GRACE_MS = 60000; // 상대 presence 플래그가 꺼진 뒤 진짜 끊김으로 판단하기까지의 유예 시간

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
const mpSignalIconEl       = document.getElementById('mp-signal-icon');
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
let roomDisconnectOp = null;  // 대기 중(매칭 전) 등록해 둔 "방 전체 삭제" onDisconnect 핸들

// ---- 매칭 후 presence(재접속 유예) 관련 상태 ----
let presenceDisconnectOp = null; // 매칭 후: 방 전체 대신 "내 플래그만 false로" 바꾸는 onDisconnect 핸들
let unsubscribePresence = null;  // 상대 presence 플래그 감시 구독 해제 함수
let unsubscribeConnInfo = null;  // .info/connected 감시 구독 해제 함수(재연결 자가복구, shkit 방식)
let mpGraceTimer = null;         // 상대 플래그가 false로 바뀐 뒤 도는 60초 유예 타이머
let partnerLastOnline = null;    // 상대의 마지막 감지 온라인 상태(진짜 "전환"만 반응하기 위한 기준값)

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

// 함께하기 연결 상태 아이콘 — 매칭 전/후엔 완전히 숨김('hidden'), 매칭되면 정상 신호('ok'),
// 상대 presence 플래그가 꺼져서 유예 타이머가 도는 동안만 끊김 신호('lost')로 바꿈.
// 남은 유예 시간은 따로 표시하지 않고 아이콘 상태만 교체함
function mpSetSignalIcon(state) {
    if (!mpSignalIconEl) return;
    mpSignalIconEl.classList.toggle('hidden', state === 'hidden');
    mpSignalIconEl.classList.toggle('mp-signal-lost', state === 'lost');
}

function mpTeardown() {
    window.mp.active = false;
    window.mp.isHost = false;
    window.mp.partnerId = null;
    window.mp.roomCode = null;
    window.mpInbox = [];
    window.mpWaiters = [];
    
    if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
    }
    if (unsubscribeRoom) {
        unsubscribeRoom();
        unsubscribeRoom = null;
    }
    if (unsubscribePresence) {
        unsubscribePresence();
        unsubscribePresence = null;
    }
    if (unsubscribeConnInfo) {
        unsubscribeConnInfo();
        unsubscribeConnInfo = null;
    }
    if (mpGraceTimer) {
        clearTimeout(mpGraceTimer);
        mpGraceTimer = null;
    }
    partnerLastOnline = null;
    mpSetSignalIcon('hidden');
    
    // 등록해 둔 onDisconnect들 해제 — 안 하면 나중에 탭을 닫을 때 이미 끝난 방(또는 다음 판의
    // 다른 방)에 뒤늦게 영향을 줄 수 있음
    if (roomDisconnectOp) {
        roomDisconnectOp.cancel().catch(() => {});
        roomDisconnectOp = null;
    }
    if (presenceDisconnectOp) {
        presenceDisconnectOp.cancel().catch(() => {});
        presenceDisconnectOp = null;
    }
    // 방장은 매칭 전(대기 중) 정리라면 방(메시지 포함)을 삭제해 DB에 찌꺼기가 쌓이지 않게 함.
    // 매칭 후 "상대가 진짜 끊김"을 감지해서 정리하는 경우는 mpStartPresence의 유예 타이머
    // 콜백에서 호스트/게스트 상관없이 별도로 방을 지움(아래 참고)
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

// 매칭이 성사된 순간(호스트: 상대 입장 감지 / 게스트: 입장 성공) 호출됨.
// "방 전체를 지우는 onDisconnect"에서 "내 presence 플래그만 false로 바꾸는 onDisconnect"로
// 전환하고, 상대 플래그를 감시하며 60초 유예 로직을 돌림(shkit의 presence 패턴 차용)
function mpStartPresence(code) {
    const myFlagPath = `rooms/${code}/${window.mp.isHost ? 'hostOnline' : 'guestOnline'}`;
    const partnerFlagPath = `rooms/${code}/${window.mp.isHost ? 'guestOnline' : 'hostOnline'}`;
    const myFlagRef = getFirebaseRef(myFlagPath);

    // 1) 새 presence onDisconnect부터 먼저 등록 — 대기방용 onDisconnect(방 전체 삭제)를 취소하기
    //    "전"에 걸어서, 취소~등록 사이의 짧은 틈에도 최소한의 보호가 항상 걸려있게 함
    const newOp = window.firebaseOnDisconnect(myFlagRef);
    newOp.set(false).catch(() => {});
    presenceDisconnectOp = newOp;

    // 2) 대기방용 "방 전체 삭제" onDisconnect는 이제 필요 없으니 취소
    if (roomDisconnectOp) {
        roomDisconnectOp.cancel().catch(() => {});
        roomDisconnectOp = null;
    }

    // 3) 재연결 자가복구 — 끊겼다가 다시 연결되면(.info/connected가 true로 바뀌면) 내 플래그를
    //    true로 복구하고 onDisconnect도 다시 걸어줌(재연결 후엔 이전 onDisconnect가 이미 소모됨)
    unsubscribeConnInfo = window.firebaseOnValue(getFirebaseRef('.info/connected'), (snap) => {
        if (snap.val() !== true) return;
        window.firebaseSet(myFlagRef, true).catch(() => {});
        const op = window.firebaseOnDisconnect(myFlagRef);
        op.set(false).catch(() => {});
        presenceDisconnectOp = op;
    });

    // 4) 상대 플래그 감시 — false로 "전환"되는 순간에만 반응해서 60초 유예를 시작하고,
    //    그 안에 true로 돌아오면 취소. 최초 스냅샷은 진짜 전환이 아니므로 기준값으로만 씀
    partnerLastOnline = true;
    mpSetSignalIcon('ok');
    unsubscribePresence = window.firebaseOnValue(getFirebaseRef(partnerFlagPath), (snap) => {
        const isOnline = snap.val() !== false; // 아직 값이 없는 경우(null)도 온라인으로 취급
        if (isOnline === partnerLastOnline) return;
        partnerLastOnline = isOnline;

        if (isOnline) {
            if (mpGraceTimer) { clearTimeout(mpGraceTimer); mpGraceTimer = null; }
            mpSetSignalIcon('ok');
            return;
        }
        mpSetSignalIcon('lost');
        mpGraceTimer = setTimeout(() => {
            mpGraceTimer = null;
            if (!window.mp.active) return;
            // 60초가 지나도 복구되지 않음 → 진짜 끊김으로 판단. 상대가 이미 없으니 호스트/게스트
            // 상관없이 지금 감지한 쪽이 방을 정리함(방장만 지우면 방장이 먼저 끊겼을 때 방이
            // 영원히 안 지워지고 남을 수 있음)
            if (currentRoomRef) window.firebaseRemove(currentRoomRef).catch(() => {});
            mpHandleRemoteGone();
        }, MP_GRACE_MS);
    });
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
        hostOnline: true, // 매칭 성사 후 presence 감시에 쓰는 플래그 — 방 생성과 동시에 심어서
                           // 별도 쓰기로 인한 경쟁 상태(그 사이 끊기면 값이 없는 경우) 자체를 없앰
        timestamp: Date.now()
    });
    
    // onDisconnect 훅: 매칭 전(대기 중)에 방장이 끊기면 방 삭제. 매칭 성사 후에는
    // mpStartPresence()가 이걸 취소하고 presence 플래그 기반으로 전환함
    roomDisconnectOp = window.firebaseOnDisconnect(currentRoomRef);
    roomDisconnectOp.remove();
    
    // 방 전체가 아니라 guest 값만 감시 — 방 전체를 감시하면 messages가 추가될 때마다
    // 콜백이 다시 불리고 메시지 전체를 매번 다시 내려받음
    unsubscribeRoom = window.firebaseOnValue(getFirebaseRef(`rooms/${code}/guest`), (snapshot) => {
        const guestId = snapshot.val();
        if (!guestId) {
            // 게임 중에 guest가 사라짐 = 방 자체가 삭제됨(상대 쪽 유예 타이머 만료로 정리했거나,
            // 드문 경쟁 상태로 대기방용 onDisconnect가 실행된 경우) → 지연 없이 즉시 처리
            if (window.mp.active) mpHandleRemoteGone();
            return;
        }
        if (window.mp.active) return;
        // 연결됨!
        window.mp.active = true;
        window.mp.isHost = true;
        window.mp.partnerId = guestId;
        window.mp.roomCode = code;
        
        mpStartPresence(code);
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
            room.guestOnline = true; // 입장과 동시에 심어서(방장과 동일하게) 별도 쓰기의 경쟁 상태를 없앰
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
    
    // 입장 직후는 이미 매칭된 상태라 대기 구간이 따로 없지만, mpStartPresence가 presence
    // onDisconnect를 걸기 전의 아주 짧은 틈까지 보호하기 위해 우선 방 전체 삭제용 onDisconnect를
    // 걸어두고, mpStartPresence 안에서 바로 presence 기반으로 전환함
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
    
    mpStartPresence(code);
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
