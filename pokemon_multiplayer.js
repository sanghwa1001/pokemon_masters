// ===================== pokemon_multiplayer.js (함께하기 — Firebase 연동) =====================
// 기존의 BroadcastChannel/localStorage 통신을 Firebase Realtime Database(RTDB) 기반으로 교체했습니다.

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
    
    if (currentRoomRef && window.mp.isHost) {
        window.firebaseRemove(currentRoomRef);
    }
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
battleTogetherBtn.addEventListener('click', () => showStartSubmenu('together'));
battleModeBackBtn.addEventListener('click', () => showStartSubmenu(null));
battleTogetherBackBtn.addEventListener('click', () => showStartSubmenu('mode'));
document.getElementById('battle-btn').addEventListener('click', () => showStartSubmenu('mode'));


mpCreateBtn.addEventListener('click', async () => {
    if (!window.firebaseDb) { alert('데이터베이스 초기화 중입니다. 잠시 후 시도해주세요.'); return; }
    
    const code = mpGenerateCode();
    mpLobbyCodeEl.textContent = code;
    mpLobbyStatusEl.innerHTML = '상대를 기다리는 중<span class="mp-dots"></span>';
    mpLobbyModalEl.classList.remove('hidden');
    
    currentRoomRef = getFirebaseRef(`rooms/${code}`);
    await window.firebaseSet(currentRoomRef, {
        host: MP_CLIENT_ID,
        status: 'waiting',
        timestamp: Date.now()
    });
    
    // onDisconnect 훅: 방장이 끊기면 방 삭제
    window.firebaseOnDisconnect(currentRoomRef).remove();
    
    // Guest가 들어오는지 감지
    unsubscribeRoom = window.firebaseOnValue(currentRoomRef, (snapshot) => {
        if (!snapshot.exists()) {
            mpHandleRemoteGone();
            return;
        }
        const val = snapshot.val();
        // 이미 연결된 상태면 중복 실행 방지(자식 노드인 messages가 추가될 때마다 onValue가 다시 트리거됨)
        if (val && val.status === 'playing' && val.guest && !window.mp.active) {
            // 연결됨!
            window.mp.active = true;
            window.mp.isHost = true;
            window.mp.partnerId = val.guest;
            window.mp.roomCode = code;
            
            setupMessageListener(code);
            
            mpLobbyModalEl.classList.add('hidden');
            showStartSubmenu(null);
            if(window.openBattlePartyPicker) window.openBattlePartyPicker();
        }
    });
});

mpJoinSubmitBtn.addEventListener('click', async () => {
    if (!window.firebaseDb) { alert('데이터베이스 초기화 중입니다. 잠시 후 시도해주세요.'); return; }
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
    
    // 입장!
    await window.firebaseUpdate(roomRef, {
        status: 'playing',
        guest: MP_CLIENT_ID
    });
    
    window.firebaseOnDisconnect(roomRef).remove();
    
    window.mp.active = true;
    window.mp.isHost = false;
    window.mp.partnerId = val.host;
    window.mp.roomCode = code;
    
    currentRoomRef = roomRef;
    
    unsubscribeRoom = window.firebaseOnValue(roomRef, (snap) => {
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
    if (currentRoomRef) window.firebaseRemove(currentRoomRef);
    mpTeardown();
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
