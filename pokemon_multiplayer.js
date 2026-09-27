// ===================== pokemon_multiplayer.js (함께하기 — Firebase 연동) =====================
// Firebase Realtime Database(RTDB)를 메시지 통로로 쓰는 서버 없는 구조(양쪽이 같은 계산을 돌림).
//
// 끊김 처리 원칙(업계 표준 턴제 PvP와 같은 방향):
//  - "연결 끊김"과 "기권"을 분리함. 연결이 잠깐 끊겨도 방을 지우지 않고(onDisconnect는 내
//    presence만 offline으로 바꿈), 유예(MP_RECONNECT_GRACE_MS) 안에 돌아오면 그대로 이어감
//  - 자기 제한시간은 자기가 판정(자동 패스/기권), 상대는 "살아 있는지"만 판정함
//  - 판정이 확정되는 순간(mpFinish) 구독·타이머를 전부 끊어서, 그 뒤로는 상대 메시지가 와도
//    턴이 진행되지 않음(제출됐지만 처리 안 된 행동은 폐기)
//  - 내 연결이 끊겼거나 막 돌아온 직후(백그라운드 복귀 포함)엔 상대를 끊는 판정을 보류하고,
//    판정 직전에 서버 왕복(mpPingServer)으로 내 쪽이 정말 연결돼 있는지 확인함
//
// 방 구조: rooms/{code} = { host, guest, status, createdAt,
//                           presence/{host|guest} = { online, lastSeen },
//                           end = { reason: 'forfeit', loser: 'host'|'guest' },
//                           match/{n}/messages/... }   ← 대전(재대결)마다 채널을 새로 씀

const MP_CODE_LENGTH = 6;
const MP_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// ---- 네트워크 조정값(전부 여기서만 바꿈) ----
const MP_RECONNECT_GRACE_MS = 30000;     // 배틀 중 상대 presence가 offline이어도 기다려 주는 시간
const MP_PEER_SLACK_MS = 10000;          // 상대 응답을 기다릴 때 단계 제한시간에 더 주는 여유
                                          // (양쪽 연출 길이 차이·기기 성능·모바일 네트워크 지연 흡수)
const MP_RESUME_SETTLE_MS = 2000;        // 내가 재연결하거나 화면에 돌아온 직후 상대 판정을 보류하는 시간
const MP_LOBBY_TTL_MS = 10 * 60 * 1000;  // 대기 방 유효 시간 — 넘으면 참가 시 만료로 처리
const MP_PING_TIMEOUT_MS = 5000;         // 판정 직전 서버 왕복 확인 제한시간
const MP_FREEZE_DETECT_MS = 3000;        // 1초 틱이 이만큼 밀리면 탭이 멈춰 있었던 것(백그라운드)으로 봄
const MP_NET_TIMEOUT_MS = 8000;          // 방 만들기·참가 확인 등 일회성 요청 제한시간
const MP_CREATE_RETRIES = 5;             // 방 코드가 겹칠 때 새 코드로 다시 시도하는 횟수
const MP_STALE_ROOM_MS = 24 * 60 * 60 * 1000; // 이보다 오래된 방은 방을 만들 때 함께 청소
const MP_STALE_ROOM_SWEEP = 20;          // 한 번에 청소하는 최대 개수

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
const mpSignalIconEls      = Array.from(document.querySelectorAll('.mp-signal-icon'));

// 전역 객체로 외부에서 접근
window.mp = { active: false, isHost: false, partnerId: null, roomCode: null };
window.mpInbox = [];
window.mpWaiters = [];
window.mpHandlers = {};
// 대전이 끝나는(더 이어갈 수 없는) 순간 한 번 불림 — info: { reason: 'forfeit', iLost } | { reason: 'disconnect' }
window.mpOnTerminal = null;

let currentRoomRef = null;
let messagesRef = null;
let unsubscribeMessages = null;
let unsubscribeRoom = null;
let unsubscribePeerPresence = null;
let unsubscribeEnd = null;
let myRole = null;              // 'host' | 'guest' — 방에 들어가 있는 동안(대기 중 포함)만 값이 있음
let myRoomCode = null;          // 들어가 있는 방 코드(매칭 전 대기 중에도 값이 있음 — mp.roomCode는 매칭 후에만)
let presenceRef = null;
let presenceDisconnectOp = null;

let mpConnected = false;        // 내 RTDB 연결 상태(.info/connected)
let mpSettleUntil = 0;          // 이 시각 전까지는 상대를 끊는 판정을 보류
let mpLastTick = Date.now();    // 1초 틱 — 탭이 멈춰 있었는지(백그라운드) 감지용
let peerOffline = false;        // 상대 presence가 offline인지
let peerOfflineTimer = null;
let peerOfflineGen = 0;
let presenceGraceEnabled = false; // 배틀(결과 화면 포함) 중에만 켬 — 파티 선택은 파티 제한시간이 상한 역할
let mpPendingJudges = [];       // 판정 보류 중인 시도들
let mpJudgeRecheckTimer = null;
let mpServerTimeOffset = 0;     // 서버 시각 - 내 기기 시각(.info/serverTimeOffset) — 기기 시계가 틀려도 방 만료 판정이 맞도록
let mpMatchNo = 0;              // 지금 쓰는 메시지 채널 번호(match/{n}) — 재대결마다 1씩 증가
let mpBusy = false;             // 방 만들기/참가 처리 중(연타 방지)

const MP_CLIENT_ID = Math.random().toString(36).slice(2) + Date.now().toString(36);

function getFirebaseRef(path) {
    if (!window.firebaseDb) return null;
    return window.firebaseRef(window.firebaseDb, path);
}

function mpPeerRole() { return myRole === 'host' ? 'guest' : 'host'; }

function mpServerNow() { return Date.now() + mpServerTimeOffset; }

// 일회성 요청이 네트워크 문제로 끝없이 매달리지 않도록 제한시간을 걺
function mpWithTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
    ]);
}

// ---------------- 연결 상태 표시(신호 아이콘) ----------------
function mpUpdateSignalIcon() {
    const lost = !mpConnected || peerOffline;
    mpSignalIconEls.forEach(el => {
        el.classList.toggle('hidden', !window.mp.active);
        el.classList.toggle('mp-signal-lost', lost);
    });
}

// ---------------- 내 연결 감시 ----------------
let mpConnectionWatchStarted = false;
function mpInitConnectionWatch() {
    if (mpConnectionWatchStarted || !window.firebaseDb) return;
    mpConnectionWatchStarted = true;
    window.firebaseOnValue(getFirebaseRef('.info/connected'), (snap) => {
        const nowConnected = snap.val() === true;
        if (nowConnected && !mpConnected) {
            // 막 (재)연결됨 — SDK가 밀린 쓰기·리스너를 다시 맞추는 동안 잠깐 판정을 보류하고,
            // 서버가 이미 실행해 버린 onDisconnect(내 presence offline)를 다시 등록 + online으로 되돌림
            mpSettleUntil = Math.max(mpSettleUntil, Date.now() + MP_RESUME_SETTLE_MS);
            mpConnected = true;
            mpRegisterPresence();
            mpScheduleJudgeRecheck();
        }
        mpConnected = nowConnected;
        mpUpdateSignalIcon();
    });
    window.firebaseOnValue(getFirebaseRef('.info/serverTimeOffset'), (snap) => {
        mpServerTimeOffset = snap.val() || 0;
    });
}
if (window.firebaseDb) mpInitConnectionWatch();
else window.addEventListener('firebase-ready', mpInitConnectionWatch);

// 백그라운드에서 돌아오면 밀려 있던 setTimeout이 한꺼번에 실행되는데, 그때 소켓은 아직 다시
// 연결되기 전일 수 있음 — 복귀 직후엔 판정을 보류. visibilitychange보다 타이머가 먼저 실행되는
// 경우도 있어서 1초 틱이 밀렸는지로도 한 번 더 감지함(mpCanJudgePeer)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        mpSettleUntil = Math.max(mpSettleUntil, Date.now() + MP_RESUME_SETTLE_MS);
        mpScheduleJudgeRecheck();
    }
});
setInterval(() => {
    const now = Date.now();
    if (now - mpLastTick > MP_FREEZE_DETECT_MS) mpSettleUntil = Math.max(mpSettleUntil, now + MP_RESUME_SETTLE_MS);
    mpLastTick = now;
}, 1000);

function mpCanJudgePeer() {
    const now = Date.now();
    if (now - mpLastTick > MP_FREEZE_DETECT_MS) {
        mpSettleUntil = Math.max(mpSettleUntil, now + MP_RESUME_SETTLE_MS);
        return false;
    }
    return mpConnected && now >= mpSettleUntil;
}

// 내 presence를 서버에 한 번 써서 응답(ack)이 오는지로 "내가 정말 연결돼 있는지" 확인함 —
// .info/connected는 소켓이 반쯤 죽은 상태를 늦게 알아채는 경우가 있어서, 상대를 끊기 직전엔
// 이 왕복 확인을 반드시 거침
function mpPingServer() {
    if (!presenceRef) return Promise.resolve(false);
    const write = window.firebaseSet(presenceRef, { online: true, lastSeen: window.firebaseServerTimestamp() })
        .then(() => true, () => false);
    const timeout = new Promise(resolve => setTimeout(() => resolve(false), MP_PING_TIMEOUT_MS));
    return Promise.race([write, timeout]);
}

// "상대가 사라졌다"는 판정 — isStillValid()가 거짓이 되면(그 사이 메시지가 와서 타이머가
// 지워졌거나 상대가 돌아옴) 조용히 취소. 내 연결 상태가 판정할 수 없는 상태면 보류했다가 다시 시도
function mpJudgePeer(isStillValid, onConfirmed) {
    const attempt = () => {
        if (!window.mp.active || !isStillValid()) return;
        if (!mpCanJudgePeer()) { mpDeferJudge(attempt); return; }
        mpPingServer().then((ok) => {
            if (!window.mp.active || !isStillValid()) return;
            if (!ok) { mpDeferJudge(attempt); return; } // 끊긴 건 내 쪽 — 상대를 탓하지 않음
            onConfirmed();
        });
    };
    attempt();
}
function mpDeferJudge(attempt) {
    mpPendingJudges.push(attempt);
    mpScheduleJudgeRecheck();
}
function mpScheduleJudgeRecheck() {
    if (!mpPendingJudges.length || mpJudgeRecheckTimer) return;
    const wait = Math.max(1000, mpSettleUntil - Date.now());
    mpJudgeRecheckTimer = setTimeout(() => {
        mpJudgeRecheckTimer = null;
        const judges = mpPendingJudges;
        mpPendingJudges = [];
        judges.forEach(fn => fn());
    }, wait);
}

// ---------------- presence(내 온라인 표시 + 상대 감시) ----------------
// Firebase 권장 순서: onDisconnect를 먼저 등록하고 그다음 online으로 씀. 서버가 onDisconnect를
// 한 번 실행하면 등록이 사라지므로, 재연결될 때마다(mpInitConnectionWatch) 다시 부름
function mpRegisterPresence() {
    if (!currentRoomRef || !myRole || !mpConnected) return;
    presenceRef = getFirebaseRef(`rooms/${myRoomCode}/presence/${myRole}`);
    presenceDisconnectOp = window.firebaseOnDisconnect(presenceRef);
    const ref = presenceRef;
    presenceDisconnectOp.set({ online: false, lastSeen: window.firebaseServerTimestamp() })
        .then(() => {
            if (presenceRef !== ref) return; // 그 사이 방을 나감
            return window.firebaseSet(ref, { online: true, lastSeen: window.firebaseServerTimestamp() });
        })
        .catch(e => console.error('presence 등록 실패', e));
}

function mpWatchPeerPresence(code) {
    unsubscribePeerPresence = window.firebaseOnValue(getFirebaseRef(`rooms/${code}/presence/${mpPeerRole()}`), (snap) => {
        const v = snap.val();
        if (!v) return; // 아직 등록 전이거나 상대가 방을 나가며 지움 — 나감은 방/메시지 쪽에서 처리
        if (v.online === false) mpMarkPeerOffline();
        else mpMarkPeerOnline();
    });
}

function mpMarkPeerOffline() {
    if (peerOffline) return;
    peerOffline = true;
    mpUpdateSignalIcon();
    mpStartPeerOfflineTimer();
}
function mpMarkPeerOnline() {
    peerOffline = false;
    peerOfflineGen++;
    if (peerOfflineTimer) { clearTimeout(peerOfflineTimer); peerOfflineTimer = null; }
    mpUpdateSignalIcon();
}
function mpStartPeerOfflineTimer() {
    if (peerOfflineTimer) { clearTimeout(peerOfflineTimer); peerOfflineTimer = null; }
    const gen = ++peerOfflineGen;
    if (!peerOffline || !presenceGraceEnabled) return;
    peerOfflineTimer = setTimeout(() => {
        peerOfflineTimer = null;
        mpJudgePeer(() => peerOffline && presenceGraceEnabled && gen === peerOfflineGen,
            () => window.mpForceDisconnect());
    }, MP_RECONNECT_GRACE_MS);
}

// 상대 메시지가 도착했다 = 상대가 살아 있다 — offline 표시가 남아 있어도 유예 시계를 지금부터 다시 셈
// (재연결 직후엔 밀린 행동 메시지가 presence online보다 먼저 도착하기 때문)
function mpNotePeerAlive() {
    if (peerOffline) mpStartPeerOfflineTimer();
}

// 배틀(결과 화면 포함) 중에만 presence 유예로 끊김 판정 — 파티 선택 단계는 로비에서 코드를
// 공유하느라 앱을 오가는 경우가 많아서, 파티 선택 제한시간이 상한 역할을 함
window.mpSetPresenceGrace = function(enabled) {
    presenceGraceEnabled = !!enabled;
    if (presenceGraceEnabled && peerOffline) mpStartPeerOfflineTimer();
    else if (!presenceGraceEnabled) {
        peerOfflineGen++;
        if (peerOfflineTimer) { clearTimeout(peerOfflineTimer); peerOfflineTimer = null; }
    }
}

// ---------------- 메시지 큐 처리 ----------------
window.mpSend = function(type, data) {
    if (!window.mp.active || !messagesRef) return;
    const msg = { type, from: MP_CLIENT_ID, timestamp: Date.now() };
    if (data !== undefined) msg.data = data;
    window.firebasePush(messagesRef, msg).catch(e => {
        console.error("Firebase send error", e);
        // 보안 규칙이 거부함 = 방이 이미 없어짐(상대가 나갔거나 끊김 판정) — 기다리지 않고 바로 처리
        if (e && /permission/i.test(e.code || e.message || '')) mpHandleRemoteGone();
    });
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


function mpHandleMessage(msg) {
    if (msg.from === MP_CLIENT_ID) return; // 내가 보낸 건 무시
    if (typeof msg.type !== 'string') return;
    mpNotePeerAlive();

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

// ---------------- 공정성: commit-reveal용 해시/난수 ----------------
// 턴마다 각자 "행동+난수"의 해시(commit)만 먼저 보내고, 양쪽 commit이 모인 뒤에야 실제 행동과
// 난수(reveal)를 공개함 — 먼저 고른 쪽의 행동을 나중 쪽이 미리 볼 수 없고, 명중/치명타 판정도
// 양쪽 난수를 합친 값으로 정해져서 어느 한쪽이 미리 알거나 조작할 수 없음(pokemon_battle.js
// mpSubmitTurnAction). crypto.subtle은 비동기이고 https/localhost에서만 되므로, 턴 흐름을 단순하게
// 유지하려고 동기식 SHA-256을 직접 둠
const MP_SHA256_K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];
function mpSha256Words(str) {
    const bytes = new TextEncoder().encode(str);
    const len = bytes.length;
    const total = Math.ceil((len + 9) / 64) * 64;
    const buf = new Uint8Array(total);
    buf.set(bytes);
    buf[len] = 0x80;
    const dv = new DataView(buf.buffer);
    const bitLen = len * 8;
    dv.setUint32(total - 8, Math.floor(bitLen / 0x100000000));
    dv.setUint32(total - 4, bitLen >>> 0);
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const w = new Uint32Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let off = 0; off < total; off += 64) {
        for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
        for (let i = 16; i < 64; i++) {
            const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
            const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
        }
        let [a, b, c, d, e, f, g, h] = H;
        for (let i = 0; i < 64; i++) {
            const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + MP_SHA256_K[i] + w[i]) >>> 0;
            const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
            h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
        }
        H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
        H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    return H;
}
window.mpSha256Hex = function(str) {
    return mpSha256Words(str).map(x => x.toString(16).padStart(8, '0')).join('');
}
// 해시에서 뽑은 0~1 사이 값 8개 — 양쪽 난수를 합친 문자열을 넣으면 두 화면에서 똑같은 판정값이 나옴
window.mpSeededUniforms = function(seedStr) {
    return mpSha256Words(seedStr).map(x => x / 0x100000000);
}
window.mpRandomNonce = function() {
    const a = new Uint32Array(4);
    crypto.getRandomValues(a);
    return Array.from(a, x => x.toString(16).padStart(8, '0')).join('');
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
//
// "내가 아직 결정 못 함"(자동 패스·기권)은 내 로컬 얘기라 정확히 durationMs에 처리함. 반대로
// "상대의 메시지를 기다리는 중"(이미 내 몫은 끝냄)이면 상대 시계는 연출 길이 차이만큼 늦게
// 시작했을 수 있으므로 곧바로 끊지 않고 mpPeerSlackThenJudge()로 여유(MP_PEER_SLACK_MS)를 더
// 준 뒤, 그래도 안 오면 mpJudgePeer로 판정함 — 호출하는 쪽(pokemon_battle.js)이 지금이
// "내 결정" 상황인지 "상대 대기" 상황인지 구분해서 둘 중 하나를 씀
let mpDeadlineTimeout = null;
let mpDeadlineInterval = null;
let mpDeadlineEl = null;
let mpDeadlineGen = 0; // 타이머를 새로 걸거나 지울 때마다 증가 — 보류된 판정이 아직 유효한지 확인용

function mpFormatCountdown(ms) {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

window.mpClearDeadlineTimer = function() {
    mpDeadlineGen++;
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
    }, durationMs);
}

// "상대의 메시지를 기다리는 중"에 단계 제한시간이 다 됐을 때 — 화면엔 아무것도 안 보이는 채로
// 여유만큼 더 기다렸다가, 그래도 메시지가 안 오면 끊김 판정. 그 사이 메시지가 오면 호출하는
// 쪽이 mpClearDeadlineTimer()로 취소함(판정이 보류 중이어도 mpDeadlineGen이 바뀌어 무효가 됨)
window.mpPeerSlackThenJudge = function() {
    window.mpStartDeadline(null, MP_PEER_SLACK_MS, () => {
        const gen = mpDeadlineGen;
        mpJudgePeer(() => gen === mpDeadlineGen, () => window.mpForceDisconnect());
    });
}

// ---------------- 정리/종료 ----------------
// 구독·타이머·onDisconnect를 전부 해제함. 방 삭제 여부는 호출하는 쪽이 정함
function mpTeardown() {
    window.mp.active = false;
    window.mp.isHost = false;
    window.mp.partnerId = null;
    window.mp.roomCode = null;
    window.mpInbox = [];
    window.mpWaiters = [];
    window.mpClearDeadlineTimer();

    [unsubscribeMessages, unsubscribeRoom, unsubscribePeerPresence, unsubscribeEnd].forEach(fn => { if (fn) fn(); });
    unsubscribeMessages = unsubscribeRoom = unsubscribePeerPresence = unsubscribeEnd = null;

    // 등록해 둔 onDisconnect 해제 + 내 presence 삭제 — 안 하면 나중에 탭을 닫을 때 이미 끝난
    // 방에 뒤늦게 presence가 써짐
    if (presenceDisconnectOp) { presenceDisconnectOp.cancel().catch(() => {}); presenceDisconnectOp = null; }
    if (presenceRef) { window.firebaseRemove(presenceRef).catch(() => {}); presenceRef = null; }

    peerOffline = false;
    peerOfflineGen++;
    if (peerOfflineTimer) { clearTimeout(peerOfflineTimer); peerOfflineTimer = null; }
    presenceGraceEnabled = false;
    mpPendingJudges = [];
    if (mpJudgeRecheckTimer) { clearTimeout(mpJudgeRecheckTimer); mpJudgeRecheckTimer = null; }

    myRole = null;
    myRoomCode = null;
    currentRoomRef = null;
    messagesRef = null;
    mpUpdateSignalIcon();
}

// 대전 종료 확정 — 이 순간 구독을 끊어서 이후 상대 메시지/타이머는 전부 무시됨
function mpFinish(info, removeRoom) {
    if (!window.mp.active) return;
    const roomRef = currentRoomRef;
    mpTeardown();
    if (removeRoom && roomRef) window.firebaseRemove(roomRef).catch(() => {});
    if (window.mpOnTerminal) window.mpOnTerminal(info);
}

// 직접 나감(×/처음으로/선택창 닫기) — 상대는 끊김 안내를 봄
window.mpLeave = function() {
    if (!currentRoomRef) return;
    window.mpSend('leave');
    const roomRef = currentRoomRef;
    mpTeardown();
    window.firebaseRemove(roomRef).catch(() => {});
}

function mpHandleRemoteGone() {
    mpFinish({ reason: 'disconnect' }, true);
}

// 상대가 사라졌다고 판정됐을 때(presence 유예 초과 / 응답 대기 초과) 또는 내 로딩 자체가 실패했을
// 때 — 방을 지워서 상대(살아 있다면)도 끊김 처리를 보게 함
window.mpForceDisconnect = function() {
    mpFinish({ reason: 'disconnect' }, true);
}

// 내 제한시간 초과로 기권 — end를 기록해서 상대가 "항복"으로 읽게 함. 방은 상대가 end를 읽은
// 뒤 지우도록 남겨 둠(방을 먼저 지우면 상대 쪽에선 끊김으로 보임)
window.mpForfeit = function() {
    if (!window.mp.active || !currentRoomRef) return;
    window.firebaseSet(getFirebaseRef(`rooms/${myRoomCode}/end`), { reason: 'forfeit', loser: myRole })
        .catch(e => console.error('기권 기록 실패', e));
    mpFinish({ reason: 'forfeit', iLost: true }, false);
}

// 상대가 end를 못 쓰고 두 번째 자동 패스를 보낸 경우 등 — 받은 쪽이 상대의 기권으로 처리
window.mpDeclarePeerForfeit = function() {
    mpFinish({ reason: 'forfeit', iLost: false }, true);
}

// ---------------- 매칭 후 공통 구독 ----------------
// match/{n}/messages 채널을 구독 — 대전마다 새 채널을 써서 지난 대전의 메시지가 섞이거나
// 계속 쌓이지 않게 함
function mpSubscribeMatchChannel(code) {
    if (unsubscribeMessages) { unsubscribeMessages(); unsubscribeMessages = null; }
    messagesRef = getFirebaseRef(`rooms/${code}/match/${mpMatchNo}/messages`);
    unsubscribeMessages = window.firebaseOnChildAdded(messagesRef, (snapshot) => {
        const msg = snapshot.val();
        if (msg) mpHandleMessage(msg);
    });
}

// 재대결에 양쪽이 동의했을 때(pokemon_battle.js) — 다음 채널로 옮기고 지난 대전의 대기열을 비움.
// 정리는 한 단계 늦게(2개 전 채널) 함: 상대가 아직 직전 채널의 마지막 메시지를 읽는 중일 수 있음
window.mpNextMatch = function() {
    if (!window.mp.active) return;
    const code = window.mp.roomCode;
    mpMatchNo++;
    window.mpInbox = [];
    window.mpWaiters = [];
    mpSubscribeMatchChannel(code);
    if (window.mp.isHost && mpMatchNo >= 2) {
        window.firebaseRemove(getFirebaseRef(`rooms/${code}/match/${mpMatchNo - 2}`)).catch(() => {});
    }
}

function mpStartMatchListeners(code) {
    mpMatchNo = 0;
    mpSubscribeMatchChannel(code);
    mpWatchPeerPresence(code);
    unsubscribeEnd = window.firebaseOnValue(getFirebaseRef(`rooms/${code}/end`), (snap) => {
        const v = snap.val();
        if (!v || !window.mp.active || v.loser === myRole) return;
        if (v.reason === 'forfeit') mpFinish({ reason: 'forfeit', iLost: false }, true);
    });
    mpUpdateSignalIcon();
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

// 비어 있거나(또는 만료된 대기 방/찌꺼기) 쓸 수 있는 코드를 트랜잭션으로 차지함 — 진행 중인
// 남의 방을 덮어쓰지 않음. 코드가 겹치면 새 코드로 다시 시도
async function mpClaimRoomCode() {
    for (let i = 0; i < MP_CREATE_RETRIES; i++) {
        const code = mpGenerateCode();
        const now = mpServerNow();
        const result = await mpWithTimeout(window.firebaseRunTransaction(getFirebaseRef(`rooms/${code}`), (room) => {
            if (room && room.host && (room.status === 'playing' || (room.createdAt && now - room.createdAt < MP_LOBBY_TTL_MS))) {
                return; // 사용 중인 방 → 중단
            }
            return { host: MP_CLIENT_ID, status: 'waiting', createdAt: now };
        }), MP_NET_TIMEOUT_MS);
        if (result.committed && result.snapshot.val() && result.snapshot.val().host === MP_CLIENT_ID) return code;
    }
    throw new Error('no free room code');
}

// 서버(Cloud Functions) 없이 하는 가벼운 청소 — 만든 지 24시간이 넘은 방(비정상 종료로 남은 방,
// createdAt 없는 찌꺼기 포함)을 몇 개씩 지움. 실패해도 게임 진행과 무관하므로 조용히 넘어감
function mpSweepStaleRooms() {
    const q = window.firebaseQuery(getFirebaseRef('rooms'),
        window.firebaseOrderByChild('createdAt'),
        window.firebaseEndAt(mpServerNow() - MP_STALE_ROOM_MS),
        window.firebaseLimitToFirst(MP_STALE_ROOM_SWEEP));
    window.firebaseGet(q).then((snap) => {
        snap.forEach((child) => {
            if (child.key === myRoomCode) return;
            window.firebaseRemove(child.ref).catch(() => {});
        });
    }).catch(() => {});
}

let mpCreateToken = 0; // 코드 생성 도중 로비 창을 닫았는지 확인용

mpCreateBtn.addEventListener('click', async () => {
    if (mpBusy || currentRoomRef) return;
    if (!window.firebaseDb) {
        if (mpTogetherFeedbackEl) mpTogetherFeedbackEl.textContent = '데이터베이스 초기화 중입니다. 잠시 후 다시 시도해주세요.';
        return;
    }
    if (!mpConnected) {
        if (mpTogetherFeedbackEl) mpTogetherFeedbackEl.textContent = '인터넷 연결을 확인해주세요.';
        return;
    }
    if (mpTogetherFeedbackEl) mpTogetherFeedbackEl.textContent = '';

    mpBusy = true;
    const token = ++mpCreateToken;
    mpLobbyCodeEl.textContent = '------';
    mpLobbyStatusEl.innerHTML = '코드를 생성하는 중<span class="mp-dots"></span>';
    mpLobbyModalEl.classList.remove('hidden');

    let code;
    try {
        code = await mpClaimRoomCode();
    } catch (e) {
        console.error('방 만들기 실패', e);
        mpBusy = false;
        if (token !== mpCreateToken) return;
        mpLobbyModalEl.classList.add('hidden');
        if (mpTogetherFeedbackEl) mpTogetherFeedbackEl.textContent = '방을 만들지 못했습니다. 잠시 후 다시 시도해주세요.';
        return;
    }
    mpBusy = false;
    // 만드는 도중 로비 창을 닫았으면 방금 차지한 방을 돌려놓음
    if (token !== mpCreateToken) {
        window.firebaseRemove(getFirebaseRef(`rooms/${code}`)).catch(() => {});
        return;
    }

    currentRoomRef = getFirebaseRef(`rooms/${code}`);
    myRoomCode = code;
    myRole = 'host';
    mpLobbyCodeEl.textContent = code;
    mpLobbyStatusEl.innerHTML = '상대를 기다리는 중<span class="mp-dots"></span>';

    // 방장이 잠깐 앱을 전환해도(초대 코드를 메신저로 보내는 등) 방은 유지 — presence만 offline이 됨
    mpRegisterPresence();
    mpSweepStaleRooms();

    // 방 전체가 아니라 guest 값만 감시 — 방 전체를 감시하면 messages가 추가될 때마다
    // 콜백이 다시 불리고 메시지 전체를 매번 다시 내려받음
    unsubscribeRoom = window.firebaseOnValue(getFirebaseRef(`rooms/${code}/guest`), (snapshot) => {
        const guestId = snapshot.val();
        if (!guestId) {
            // 게임 중에 guest가 사라짐 = 방 자체가 삭제됨(상대가 나갔거나 상대 쪽에서 끊김 판정) → 즉시 처리
            if (window.mp.active) mpHandleRemoteGone();
            return;
        }
        if (window.mp.active) return;
        // 연결됨!
        window.mp.active = true;
        window.mp.isHost = true;
        window.mp.partnerId = guestId;
        window.mp.roomCode = code;

        mpStartMatchListeners(code);

        mpLobbyModalEl.classList.add('hidden');
        showStartSubmenu(null);
        if(window.openBattlePartyPicker) window.openBattlePartyPicker();
    });
});

mpJoinSubmitBtn.addEventListener('click', async () => {
    if (mpBusy || currentRoomRef) return;
    if (!window.firebaseDb) { mpJoinFeedbackEl.textContent = '데이터베이스 초기화 중입니다. 잠시 후 다시 시도해주세요.'; return; }
    const code = mpJoinInputEl.value.toUpperCase().trim();
    if (code.length !== MP_CODE_LENGTH) return;
    if (!mpConnected) { mpJoinFeedbackEl.textContent = '인터넷 연결을 확인해주세요.'; return; }

    mpBusy = true;
    mpJoinSubmitBtn.disabled = true;
    mpJoinFeedbackEl.textContent = '확인 중...';
    const roomRef = getFirebaseRef(`rooms/${code}`);
    const fail = (text) => {
        mpBusy = false;
        mpJoinSubmitBtn.disabled = false;
        mpJoinFeedbackEl.textContent = text;
    };

    // 입장 — 존재·상태·만료 확인과 자리 차지를 트랜잭션 하나로 처리해서, 두 명이 동시에 같은
    // 코드로 들어와도 한 명만 성공하고 확인과 입장 사이에 방 상태가 바뀌는 틈도 없음
    let outcome = 'invalid';
    let hostId = null;
    try {
        const now = mpServerNow();
        const result = await mpWithTimeout(window.firebaseRunTransaction(roomRef, (room) => {
            // 로컬 캐시가 비어 첫 호출이 null로 올 수 있음 → null을 돌려주면 서버 값으로 재시도됨
            if (room === null) { outcome = 'invalid'; return null; }
            if (!room.host) { outcome = 'invalid'; return; }
            if (room.status !== 'waiting' || room.guest) { outcome = 'full'; return; }
            if (!room.createdAt || now - room.createdAt > MP_LOBBY_TTL_MS) { outcome = 'expired'; return; }
            outcome = 'joined';
            room.status = 'playing';
            room.guest = MP_CLIENT_ID;
            return room;
        }), MP_NET_TIMEOUT_MS);
        const after = result.snapshot.val();
        if (!(result.committed && after && after.guest === MP_CLIENT_ID)) {
            if (outcome === 'joined') outcome = 'full';
        } else {
            hostId = after.host;
        }
    } catch (e) {
        console.error('Firebase join error', e);
        fail(e && e.message === 'timeout' ? '응답이 없습니다. 인터넷 연결을 확인해주세요.' : '입장하지 못했습니다. 잠시 후 다시 시도해주세요.');
        return;
    }
    if (outcome === 'expired') {
        window.firebaseRemove(roomRef).catch(() => {}); // 오래 방치된 방은 정리
        fail('만료된 코드입니다. 새 코드를 받아주세요.');
        return;
    }
    if (outcome === 'full') { fail('이미 게임이 시작되었거나 닫힌 방입니다.'); return; }
    if (outcome !== 'joined') {
        // 트랜잭션이 null로 끝나면 커밋된 null이 방을 만들지는 않지만, 혹시 남은 찌꺼기는 무시
        fail('유효하지 않은 코드입니다.');
        return;
    }

    mpBusy = false;
    mpJoinSubmitBtn.disabled = false;
    window.mp.active = true;
    window.mp.isHost = false;
    window.mp.partnerId = hostId;
    window.mp.roomCode = code;

    currentRoomRef = roomRef;
    myRoomCode = code;
    myRole = 'guest';
    mpRegisterPresence();

    // 방 전체 대신 host 값만 감시(메시지마다 전체를 다시 받지 않도록) — 방이 삭제되면 null이 됨
    unsubscribeRoom = window.firebaseOnValue(getFirebaseRef(`rooms/${code}/host`), (snap) => {
        if (!snap.exists()) mpHandleRemoteGone();
    });

    mpStartMatchListeners(code);

    mpJoinModalEl.classList.add('hidden');
    mpJoinInputEl.value = '';
    mpJoinFeedbackEl.textContent = '';
    showStartSubmenu(null);
    if(window.openBattlePartyPicker) window.openBattlePartyPicker();
});

mpLobbyCloseBtn.addEventListener('click', () => {
    mpLobbyModalEl.classList.add('hidden');
    mpCreateToken++; // 아직 코드를 만드는 중이었다면 결과를 버리게 함
    const roomRef = currentRoomRef;
    mpTeardown();
    if (roomRef) window.firebaseRemove(roomRef).catch(() => {});
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
