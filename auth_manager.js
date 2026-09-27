import { db, auth, googleProvider, authPersistenceReady } from "./firebase_config.js";
import { ref, set, get, update, push, remove, onValue, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// ===================== auth_manager.js (구글 로그인 + 관리자 기능) =====================
// 학생·관리자 모두 구글 계정으로 로그인하고, 역할은 이메일로 판단함:
//   admins/{이메일키} = true            → 관리자(콘솔에서만 등록 가능 — 보안 규칙이 코드 쓰기를 막음)
//   allowedStudents/{이메일키} = {...}   → 선생님이 등록한 학생
//   둘 다 아니면                        → "등록되지 않은 계정" 안내 후 로그아웃
// 학생 데이터는 students/{uid}(도감·선택한 학습 데이터)에 저장됨. 이메일키는 이메일을 소문자로
// 바꾸고 '.'을 ','로 바꾼 값(RTDB 키에는 '.'을 쓸 수 없음) — 보안 규칙도 같은 방식으로 계산함

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const startScreen = document.getElementById('start-screen');
const adminDashboard = document.getElementById('admin-dashboard-screen');
const googleLoginBtn = document.getElementById('btn-google-login');
const loginFeedbackEl = document.getElementById('login-feedback');
const loginStatusEl = document.getElementById('login-status');
const inappNoticeEl = document.getElementById('inapp-browser-notice');
const openExternalBtn = document.getElementById('btn-open-external');

// Modals — 관리자 대시보드의 버튼들(학생 등록/관리, 학습 데이터 업로드/관리)이 여는 창은
// 전부 같은 방식(.mp-modal/.mp-box, 대시보드를 가리지 않고 위에 떠서 열리고 ×로 닫힘)으로 통일함
const adminStudentCreateModal = document.getElementById('admin-student-create-modal');
const adminStudentManageModal = document.getElementById('admin-student-manage-modal');
const adminDataUploadModal = document.getElementById('admin-data-upload-modal');
const adminDataManageModal = document.getElementById('admin-data-manage-modal');
const studentDataSelectModal = document.getElementById('student-data-select-modal');

// --- Navigation & Modal Helpers ---
function showModal(modal) { modal.classList.remove('hidden'); }
function hideModal(modal) { modal.classList.add('hidden'); }
function switchScreen(screen) {
    [loginScreen, startScreen, adminDashboard].forEach(s => {
        if (s) s.classList.add('hidden');
    });
    screen.classList.remove('hidden');
}

// alert() 팝업 대신 모달 안 한 줄에 결과를 표시하는 공용 헬퍼 — 도감 치트 코드 페이지
// (#dex-cheat-feedback)와 같은 방식으로, 네이티브 브라우저 알림 대신 나머지 UI와
// 같은 톤으로 성공/실패를 보여줌
function setFieldFeedback(el, message, type) {
    if (!el) return;
    el.textContent = message || '';
    el.classList.remove('success', 'error');
    if (type) el.classList.add(type);
}

// 이메일 → DB 키(소문자 + '.'→','). 보안 규칙의 auth.token.email.toLowerCase().replace('.', ',')와 같은 값
function emailKeyOf(email) {
    return String(email || '').trim().toLowerCase().replace(/\./g, ',');
}

// 관리자/학생 쪽 목록(학습 데이터 관리, 학습 데이터 선택) 두 곳이 전부 "이름 + (있으면) 삭제 버튼"
// 또는 "줄 전체 클릭"이라는 같은 모양의 .admin-row 한 줄을 쓰므로 공용으로 뽑음
function renderAdminRow(labelText, { clickable, onClick, deleteConfirmMessage, onDelete } = {}) {
    const row = document.createElement('div');
    row.className = clickable ? 'admin-row clickable' : 'admin-row';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'admin-row-name';
    titleSpan.textContent = labelText;
    row.appendChild(titleSpan);

    if (onClick) row.onclick = onClick;

    if (onDelete) {
        const delBtn = document.createElement('button');
        delBtn.className = 'dex-settings-action-btn dex-danger dex-danger-sm';
        delBtn.textContent = '삭제';
        delBtn.onclick = async () => {
            if (confirm(deleteConfirmMessage)) {
                await onDelete();
                row.remove(); // onValue 실시간 목록이면 어차피 다시 그려지지만, 그 전까지 기다리지 않고 바로 빠지도록
            }
        };
        row.appendChild(delBtn);
    }
    return row;
}

// listContainer를 "items가 비어있으면 안내문 / 아니면 rowBuilder(item)으로 만든 줄들"로 채움.
// "로딩 중..." 표시~완료까지의 흐름은 목록마다 비동기 방식이 달라서(onValue 실시간 vs get()
// 1회성) 호출하는 쪽에서 그대로 처리하고, 이 함수는 다 받아온 뒤의 렌더링만 담당
function renderAdminList(listContainer, items, emptyMessage, rowBuilder) {
    listContainer.innerHTML = '';
    if (!items.length) {
        listContainer.innerHTML = `<div class="admin-row-empty">${emptyMessage}</div>`;
        return;
    }
    items.forEach(item => listContainer.appendChild(rowBuilder(item)));
}

// Close buttons
document.getElementById('admin-student-create-close-btn').addEventListener('click', () => hideModal(adminStudentCreateModal));
document.getElementById('admin-student-manage-close-btn').addEventListener('click', () => hideModal(adminStudentManageModal));
document.getElementById('admin-data-upload-close-btn').addEventListener('click', () => hideModal(adminDataUploadModal));
document.getElementById('admin-data-manage-close-btn').addEventListener('click', () => {
    stopAdminLearningDataListener();
    hideModal(adminDataManageModal);
});
document.getElementById('student-data-select-close-btn').addEventListener('click', () => hideModal(studentDataSelectModal));


// ===================== 로그인 =====================

// 카카오톡·네이버·인스타그램 등 앱 안의 브라우저(WebView) — 구글이 보안상 로그인을 막아서
// 버튼을 눌러도 "액세스 차단" 오류만 뜨므로, 처음부터 외부 브라우저로 안내함
const UA = navigator.userAgent || '';
const IN_APP_BROWSER_RE = /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|FB_IAB|Line\/|DaumApps|everytimeApp|Whale\/.*inapp|; wv\)/i;
const isInAppBrowser = IN_APP_BROWSER_RE.test(UA);
const isKakaoTalk = /KAKAOTALK/i.test(UA);
const isAndroid = /Android/i.test(UA);

function externalBrowserUrl() {
    // 카카오톡은 자체 스킴으로 기본 브라우저를 열 수 있고(안드로이드·iOS 공통), 그 밖의 안드로이드
    // 앱은 Chrome 인텐트로 엶. iOS의 다른 앱은 방법이 없어 안내 문구만 보여줌
    if (isKakaoTalk) return 'kakaotalk://web/openExternal?url=' + encodeURIComponent(location.href);
    if (isAndroid) return 'intent://' + location.href.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end';
    return null;
}

// 로그인 상태 확인 중 — 버튼 자리에 진행 문구(로그인 확인 중/계정 확인 중)를 대신 보여줌
function showLoginStatus(text) {
    googleLoginBtn.classList.add('hidden');
    loginStatusEl.textContent = text;
    loginStatusEl.classList.remove('hidden');
    setFieldFeedback(loginFeedbackEl, '');
}

function showLoginScreen(message, type) {
    window.currentStudentId = null;
    switchScreen(loginScreen);
    loginStatusEl.classList.add('hidden');
    if (isInAppBrowser) {
        googleLoginBtn.classList.add('hidden');
        inappNoticeEl.classList.remove('hidden');
        openExternalBtn.classList.toggle('hidden', !externalBrowserUrl());
    } else {
        googleLoginBtn.classList.remove('hidden');
        googleLoginBtn.disabled = false;
    }
    setFieldFeedback(loginFeedbackEl, message, type);
}

openExternalBtn.addEventListener('click', () => {
    const url = externalBrowserUrl();
    if (url) location.href = url;
});

// 로그인 시도 결과 코드별 안내 — 관리자 설정 문제(도메인 미등록/구글 로그인 미사용)는 원인을 적어줌
function loginErrorMessage(e) {
    switch (e && e.code) {
        case 'auth/popup-closed-by-user':
        case 'auth/cancelled-popup-request':
            return '';
        case 'auth/popup-blocked':
            return '로그인 창이 차단되었습니다. 팝업을 허용한 뒤 다시 시도해주세요.';
        case 'auth/network-request-failed':
            return '인터넷 연결을 확인해주세요.';
        case 'auth/unauthorized-domain':
            return '이 주소에서는 로그인할 수 없습니다. (관리자: Firebase 승인된 도메인을 확인하세요)';
        case 'auth/operation-not-allowed':
            return 'Google 로그인이 켜져 있지 않습니다. (관리자: Firebase 콘솔을 확인하세요)';
        default:
            return '로그인하지 못했습니다. 잠시 후 다시 시도해주세요.' + (e && e.code ? ` (${e.code})` : '');
    }
}

googleLoginBtn.addEventListener('click', async () => {
    googleLoginBtn.disabled = true;
    setFieldFeedback(loginFeedbackEl, '');
    try {
        await authPersistenceReady;
        await signInWithPopup(auth, googleProvider);
        // 성공하면 onAuthStateChanged가 역할을 판단해 화면을 넘김
    } catch (e) {
        console.error('구글 로그인 실패', e);
        setFieldFeedback(loginFeedbackEl, loginErrorMessage(e), 'error');
        googleLoginBtn.disabled = false;
    }
});

// 로그인 화면으로 돌아갈 때 띄울 안내(등록되지 않은 계정 등 — 직접 로그아웃한 경우엔 안내 없음)
let pendingLoginNotice = null;
// 역할 판단이 비동기라, 그 사이 다시 로그인/로그아웃되면 이전 판단 결과는 버림
let authRouteToken = 0;

onAuthStateChanged(auth, (user) => {
    const token = ++authRouteToken;
    if (!user) {
        const notice = pendingLoginNotice;
        pendingLoginNotice = null;
        showLoginScreen(notice ? notice.text : '', notice ? notice.type : null);
        return;
    }
    routeSignedInUser(user, token);
});

async function routeSignedInUser(user, token) {
    showLoginStatus('계정 확인 중...');
    const key = emailKeyOf(user.email);
    try {
        const adminSnap = await get(ref(db, `admins/${key}`));
        if (token !== authRouteToken) return;
        if (adminSnap.val() === true) {
            enterAdmin();
            return;
        }
        const studentSnap = await get(ref(db, `allowedStudents/${key}`));
        if (token !== authRouteToken) return;
        if (!studentSnap.exists()) {
            pendingLoginNotice = {
                text: `등록되지 않은 계정입니다 (${user.email}). 선생님께 등록을 요청하세요.`,
                type: 'error'
            };
            await signOut(auth);
            return;
        }
        await enterStudent(user, key, studentSnap.val(), token);
    } catch (e) {
        console.error('계정 확인 실패', e);
        if (token !== authRouteToken) return;
        pendingLoginNotice = { text: '계정 정보를 불러오지 못했습니다. 잠시 후 다시 로그인해주세요.', type: 'error' };
        await signOut(auth).catch(() => {});
    }
}

// 관리자가 학생 모드로 게임 중인지 — 이때 학생 시작화면 맨 아래 버튼은 "로그아웃" 대신
// "관리자 메뉴"(관리자 대시보드로 돌아가기)가 됨
let adminStudentMode = false;
const studentLogoutBtn = document.getElementById('btn-student-logout');

function enterAdmin() {
    window.currentStudentId = null;
    adminStudentMode = false;
    studentLogoutBtn.textContent = '로그아웃';
    setFieldFeedback(loginFeedbackEl, '');
    switchScreen(adminDashboard);
}

async function enterStudent(user, key, entry, token) {
    // 첫 로그인 때 등록 항목에 uid를 남겨 둠 — 관리자가 학생을 삭제할 때 도감 기록(students/{uid})도
    // 찾아서 지울 수 있게 함
    if (entry.uid !== user.uid) {
        await set(ref(db, `allowedStudents/${key}/uid`), user.uid).catch(e => console.error('학생 uid 기록 실패', e));
    }
    adminStudentMode = false;
    studentLogoutBtn.textContent = '로그아웃';
    await startStudentSession(user, entry.name || user.displayName || '', token);
}

// 학생 시작화면으로 들어가 게임 데이터(students/{uid} — 도감·선택한 학습 데이터)를 불러옴.
// 학생 로그인과 관리자의 학생 모드가 함께 씀(관리자는 관리자 본인 uid 몫의 데이터를 씀)
async function startStudentSession(user, name, token) {
    const uid = user.uid;
    const studentRef = ref(db, `students/${uid}`);
    const snap = await get(studentRef);
    if (token !== authRouteToken) return;
    const data = snap.val() || {};
    const profile = { email: String(user.email).toLowerCase(), name };
    if (data.email !== profile.email || data.name !== profile.name) {
        await update(studentRef, profile).catch(e => console.error('학생 정보 저장 실패', e));
    }

    window.currentStudentId = uid;
    setFieldFeedback(loginFeedbackEl, '');
    switchScreen(startScreen);

    if (data.pokedex && window.loadPokedexFromFirebase) window.loadPokedexFromFirebase(data.pokedex);

    // 이전에 선택해둔 학습 데이터가 있으면 다시 고르지 않아도 자동으로 적용
    // (선택을 바꾸기 전까지는 계정에 남아있어 다음 로그인에도 계속 유지됨)
    if (data.selectedDataId) {
        try {
            const dataSnapshot = await get(ref(db, `learningData/${data.selectedDataId}`));
            if (token !== authRouteToken) return;
            if (dataSnapshot.exists() && window.applyLearningData) {
                const learning = dataSnapshot.val();
                window.applyLearningData(learning.questions, learning.title);
                document.getElementById('btn-select-learning-data').textContent = "학습 데이터 변경";
            }
        } catch (e) {
            console.error('저장된 학습 데이터 불러오기 실패', e);
        }
    }
}

// 학생 시작화면의 게임 데이터 표시(도감·학습 데이터 선택 상태)를 비움 — 로그아웃과 학생 모드 종료가 함께 씀.
// 실제 기록(students/{uid})은 계정에 남아 다음에 다시 불러옴
function clearStudentSessionLocal() {
    if (window.resetPokedexLocal) window.resetPokedexLocal();
    if (window.resetLearningDataLocal) window.resetLearningDataLocal();
    document.getElementById('btn-select-learning-data').textContent = "학습 데이터 선택";
    window.currentStudentId = null;
}

// 관리자 대시보드 → 학생 모드
const adminStudentModeBtn = document.getElementById('btn-admin-student-mode');
adminStudentModeBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;
    adminStudentModeBtn.disabled = true;
    try {
        adminStudentMode = true;
        studentLogoutBtn.textContent = '관리자 메뉴';
        await startStudentSession(user, user.displayName || '', authRouteToken);
    } catch (e) {
        console.error('학생 모드 진입 실패', e);
        adminStudentMode = false;
        studentLogoutBtn.textContent = '로그아웃';
    }
    adminStudentModeBtn.disabled = false;
});

// 학생·관리자 공용 로그아웃 — 로그아웃이 된 뒤에만 화면 상태를 비움(실패하면 지금 화면 그대로 둠).
// 로그인 화면 전환은 onAuthStateChanged가 함
async function logout() {
    try {
        await signOut(auth);
    } catch (e) {
        console.error('로그아웃 실패', e);
        return;
    }
    stopAdminLearningDataListener();
    [adminStudentCreateModal, adminStudentManageModal, adminDataUploadModal, adminDataManageModal, studentDataSelectModal].forEach(hideModal);
    adminStudentMode = false;
    studentLogoutBtn.textContent = '로그아웃';
    clearStudentSessionLocal();
}

// 학생 시작화면 맨 아래 버튼 — 학생은 로그아웃, 학생 모드의 관리자는 관리자 대시보드로 돌아감
studentLogoutBtn.addEventListener('click', () => {
    if (!adminStudentMode) { logout(); return; }
    hideModal(studentDataSelectModal);
    clearStudentSessionLocal();
    enterAdmin();
});
document.getElementById('btn-admin-logout').addEventListener('click', logout);


// ===================== 관리자: 학생 등록 =====================

const EMAIL_RE = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;
const studentCreateFeedbackEl = document.getElementById('admin-student-create-feedback');
const studentRegisterEmailEl = document.getElementById('student-register-email');
const studentRegisterNameEl = document.getElementById('student-register-name');
const studentRegisterBtn = document.getElementById('btn-register-student');
const studentRegisterFileEl = document.getElementById('student-register-file');

document.getElementById('btn-admin-create-student').addEventListener('click', () => {
    setFieldFeedback(studentCreateFeedbackEl, '');
    studentRegisterEmailEl.value = '';
    studentRegisterNameEl.value = '';
    showModal(adminStudentCreateModal);
    studentRegisterEmailEl.focus();
});

// [이메일, 이름?] 목록을 allowedStudents에 추가하고 { added, duplicate, invalid }를 돌려줌 —
// 형식 오류·목록 안 중복·이미 등록된 이메일은 건너뜀. 한 명 등록과 엑셀 일괄 등록이 같이 씀
async function addStudents(pairs) {
    const existing = (await get(ref(db, 'allowedStudents'))).val() || {};
    const updates = {};
    let invalid = 0, duplicate = 0;
    const now = Date.now();
    pairs.forEach(([email, name]) => {
        if (!EMAIL_RE.test(email)) { invalid++; return; }
        const key = emailKeyOf(email);
        if (existing[key] || updates[key]) { duplicate++; return; }
        const entry = { email: email.toLowerCase(), addedAt: now };
        if (name) entry.name = name.slice(0, 100);
        updates[key] = entry;
    });
    const added = Object.keys(updates).length;
    if (added) await update(ref(db, 'allowedStudents'), updates);
    return { added, duplicate, invalid };
}

// 한 명 등록 — 성공하면 입력칸을 비우고 이메일 칸으로 돌아가서 다음 학생을 바로 입력할 수 있게 함
async function registerOneStudent() {
    const email = studentRegisterEmailEl.value.trim();
    const name = studentRegisterNameEl.value.trim();
    if (!email) {
        setFieldFeedback(studentCreateFeedbackEl, '이메일을 입력해주세요', 'error');
        studentRegisterEmailEl.focus();
        return;
    }
    if (!EMAIL_RE.test(email)) {
        setFieldFeedback(studentCreateFeedbackEl, '올바르지 않은 이메일입니다', 'error');
        studentRegisterEmailEl.focus();
        return;
    }
    studentRegisterBtn.disabled = true;
    setFieldFeedback(studentCreateFeedbackEl, '등록 중...');
    try {
        const { added } = await addStudents([[email, name]]);
        if (added) {
            setFieldFeedback(studentCreateFeedbackEl, '학생이 등록되었습니다', 'success');
            studentRegisterEmailEl.value = '';
            studentRegisterNameEl.value = '';
        } else {
            setFieldFeedback(studentCreateFeedbackEl, '이미 등록된 이메일입니다', 'error');
        }
    } catch (e) {
        console.error(e);
        setFieldFeedback(studentCreateFeedbackEl, '등록하지 못했습니다', 'error');
    }
    studentRegisterBtn.disabled = false;
    studentRegisterEmailEl.focus();
}

studentRegisterBtn.addEventListener('click', registerOneStudent);
// 이메일 칸에서 Enter → 이름 칸으로, 이름 칸에서 Enter → 등록
studentRegisterEmailEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); studentRegisterNameEl.focus(); }
});
studentRegisterNameEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); registerOneStudent(); }
});

// 엑셀 일괄 등록 — 결과를 "추가 N명, 이미 등록 N명, 형식 오류 N건"으로 집계. 첫 줄이 이메일이
// 아니면(머리글 "이메일, 이름" 등) 오류로 세지 않고 조용히 건너뜀
async function registerStudentsFromRows(rows) {
    const pairs = rows
        .map(r => [String(r[0] ?? '').trim(), String(r[1] ?? '').trim()])
        .filter(([email]) => email !== '');
    if (pairs.length && !EMAIL_RE.test(pairs[0][0])) pairs.shift();
    if (!pairs.length) {
        setFieldFeedback(studentCreateFeedbackEl, '등록할 이메일이 없습니다', 'error');
        return;
    }
    setFieldFeedback(studentCreateFeedbackEl, '등록 중...');
    try {
        const { added, duplicate, invalid } = await addStudents(pairs);
        // 치트 코드 안내처럼 결과만 한 문장으로 — 건너뛴 줄이 있으면 괄호로 개수만 덧붙임
        const skipped = [duplicate ? `중복 ${duplicate}` : '', invalid ? `오류 ${invalid}` : ''].filter(Boolean).join(', ');
        if (added) {
            setFieldFeedback(studentCreateFeedbackEl, `${added}명이 등록되었습니다` + (skipped ? ` (${skipped})` : ''), 'success');
        } else {
            setFieldFeedback(studentCreateFeedbackEl, invalid ? `등록된 학생이 없습니다 (${skipped})` : '이미 등록된 이메일입니다', 'error');
        }
    } catch (e) {
        console.error(e);
        setFieldFeedback(studentCreateFeedbackEl, '등록하지 못했습니다', 'error');
    }
}

// 엑셀 — 첫 번째 시트의 첫 열 이메일, 둘째 열 이름(학습 데이터 업로드와 같은 XLSX 라이브러리)
document.getElementById('btn-register-students-excel').addEventListener('click', () => {
    studentRegisterFileEl.value = '';
    studentRegisterFileEl.click();
});
studentRegisterFileEl.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const workbook = XLSX.read(new Uint8Array(evt.target.result), { type: 'array' });
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
            registerStudentsFromRows(rows.filter(Array.isArray));
        } catch (err) {
            console.error(err);
            setFieldFeedback(studentCreateFeedbackEl, '파일을 읽을 수 없습니다', 'error');
        }
    };
    reader.readAsArrayBuffer(file);
});


// ===================== 관리자: 학생 관리 =====================
// 도감 목록과 같은 구성 — 위쪽 줄 "전체 선택"(도감의 "잡음"과 같은 체크박스) + 인원수, 각 줄 왼쪽
// 체크박스로 골라 아래 "삭제하기"로 삭제

const studentListContainer = document.getElementById('student-list-container');
const studentCountEl = document.getElementById('student-count');
const studentSelectAllEl = document.getElementById('student-select-all');
const studentDeleteBtn = document.getElementById('btn-delete-students');
const studentDeleteFeedbackEl = document.getElementById('student-delete-feedback');

function studentCheckboxes() {
    return Array.from(studentListContainer.querySelectorAll('.admin-row-check'));
}

// "전체 선택" 상태와 삭제하기 버튼(한 명 이상 골랐을 때만 누를 수 있음)을 목록에 맞춤
function updateStudentSelectionUI() {
    const boxes = studentCheckboxes();
    const checked = boxes.filter(b => b.checked).length;
    studentSelectAllEl.checked = boxes.length > 0 && checked === boxes.length;
    studentSelectAllEl.indeterminate = checked > 0 && checked < boxes.length;
    studentSelectAllEl.disabled = boxes.length === 0;
    studentDeleteBtn.disabled = checked === 0;
}

// 한 줄: [체크박스] 이름(없으면 "이름 없음") · 아직 로그인 전이면 "미접속" / 둘째 줄 아이디(이메일).
// 줄 전체가 label이라 줄 아무 곳이나 눌러도 선택됨
function renderStudentRow({ key, data }) {
    const row = document.createElement('label');
    row.className = 'admin-row admin-student-row';

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'admin-row-check';
    box.dataset.key = key;
    box.dataset.email = data.email;
    if (data.uid) box.dataset.uid = data.uid;
    box.addEventListener('change', updateStudentSelectionUI);
    row.appendChild(box);

    const text = document.createElement('span');
    text.className = 'admin-row-name';
    const nameLine = document.createElement('span');
    nameLine.className = data.name ? 'admin-row-main' : 'admin-row-main admin-row-muted';
    nameLine.textContent = data.name || '이름 없음';
    if (!data.uid) {
        const tag = document.createElement('span');
        tag.className = 'admin-row-tag';
        tag.textContent = '미접속';
        nameLine.appendChild(tag);
    }
    const idLine = document.createElement('span');
    idLine.className = 'admin-row-sub';
    idLine.textContent = data.email;
    text.appendChild(nameLine);
    text.appendChild(idLine);
    row.appendChild(text);
    return row;
}

async function loadStudentList() {
    studentListContainer.innerHTML = '로딩 중...';
    updateStudentSelectionUI();
    try {
        const snapshot = await get(ref(db, 'allowedStudents'));
        const entries = Object.entries(snapshot.val() || {})
            .map(([key, data]) => ({ key, data }))
            .sort((a, b) => (a.data.name || a.data.email).localeCompare(b.data.name || b.data.email, 'ko'));
        studentCountEl.textContent = `${entries.length}명`;
        renderAdminList(studentListContainer, entries, '등록된 학생이 없습니다', renderStudentRow);
    } catch (e) {
        console.error(e);
        studentCountEl.textContent = '0명';
        studentListContainer.innerHTML = '<div class="admin-row-empty">학생 목록을 불러올 수 없습니다</div>';
    }
    updateStudentSelectionUI();
}

document.getElementById('btn-admin-manage-students').addEventListener('click', () => {
    setFieldFeedback(studentDeleteFeedbackEl, '');
    showModal(adminStudentManageModal);
    loadStudentList();
});

studentSelectAllEl.addEventListener('change', () => {
    studentCheckboxes().forEach(b => { b.checked = studentSelectAllEl.checked; });
    updateStudentSelectionUI();
});

// 고른 학생들을 명단(allowedStudents)과 학생 데이터(students/{uid} — 도감·선택한 학습 데이터)에서
// 한 번에 삭제. 학생 데이터는 명단에 기록된 uid뿐 아니라 이메일로도 찾아서, uid 기록이 빠져 있어도
// 데이터가 남지 않게 함. 구글 로그인 기록(Authentication 사용자 목록)은 브라우저에서 지울 수 없어
// 남지만, 명단에서 빠졌으므로 더 이상 로그인할 수 없음
// 이메일로 학생 데이터(students/{uid})의 uid를 찾음 — 보안 규칙에 students의 email 인덱스가 게시돼
// 있지 않으면 이메일 검색 자체가 "Index not defined" 오류로 실패하므로, 그때는 학생 데이터 전체를
// 한 번 읽어서 이메일을 직접 비교함(관리자는 전체를 읽을 수 있음). 인덱스가 있으면 필요한 것만 받음
async function findStudentUidsByEmail(emails) {
    const found = new Set();
    try {
        await Promise.all(emails.map(async (email) => {
            const snap = await get(query(ref(db, 'students'), orderByChild('email'), equalTo(email)));
            snap.forEach(child => { found.add(child.key); });
        }));
    } catch (e) {
        console.warn('이메일 검색 실패 — 학생 데이터 전체에서 찾음', e);
        const wanted = new Set(emails);
        const all = await get(ref(db, 'students'));
        all.forEach(child => {
            const data = child.val();
            if (data && wanted.has(String(data.email || '').toLowerCase())) found.add(child.key);
        });
    }
    return found;
}

studentDeleteBtn.addEventListener('click', async () => {
    const selected = studentCheckboxes().filter(b => b.checked);
    if (!selected.length) return;
    if (!confirm(`${selected.length}명을 삭제하시겠습니까?\n도감 기록도 함께 삭제되며 되돌릴 수 없습니다`)) return;

    studentDeleteBtn.disabled = true;
    setFieldFeedback(studentDeleteFeedbackEl, '삭제 중...');
    try {
        const updates = {};
        selected.forEach(b => {
            updates[`allowedStudents/${b.dataset.key}`] = null;
            if (b.dataset.uid) updates[`students/${b.dataset.uid}`] = null;
        });
        const uidsByEmail = await findStudentUidsByEmail(selected.map(b => String(b.dataset.email || '').toLowerCase()));
        uidsByEmail.forEach(uid => { updates[`students/${uid}`] = null; });
        // 여러 경로를 한 번에 지우는 다중 경로 update — 중간에 실패해도 일부만 지워지지 않음
        await update(ref(db), updates);
        setFieldFeedback(studentDeleteFeedbackEl, `${selected.length}명이 삭제되었습니다`, 'success');
    } catch (e) {
        console.error(e);
        setFieldFeedback(studentDeleteFeedbackEl, '삭제하지 못했습니다', 'error');
    }
    loadStudentList();
});


// ===================== 관리자: 학습 데이터 =====================

document.getElementById('btn-admin-upload-data').addEventListener('click', () => {
    setFieldFeedback(document.getElementById('data-upload-feedback'), '');
    showModal(adminDataUploadModal);
});

document.getElementById('btn-admin-manage-data').addEventListener('click', () => {
    showModal(adminDataManageModal);
    loadLearningDataForAdmin();
});

// Excel Upload (Admin) -> 파싱은 pokemon_learning.js, 저장만 여기서
window.uploadLearningDataToFirebase = async function(parsedQuestions) {
    const title = document.getElementById('data-title-input').value.trim() || "제목 없음";
    const feedbackEl = document.getElementById('data-upload-feedback');
    try {
        const newDataRef = push(ref(db, 'learningData'));
        await set(newDataRef, {
            title: title,
            questions: parsedQuestions
        });
        setFieldFeedback(feedbackEl, '학습 데이터가 성공적으로 업로드되었습니다.', 'success');
        document.getElementById('data-title-input').value = '';
        document.getElementById('excel-input').value = ''; // reset file input
        loadLearningDataForAdmin(); // refresh list
    } catch (e) {
        console.error(e);
        setFieldFeedback(feedbackEl, '업로드 실패: ' + e.message, 'error');
    }
};

let unsubscribeAdminLearningData = null;
function stopAdminLearningDataListener() {
    if (unsubscribeAdminLearningData) {
        unsubscribeAdminLearningData();
        unsubscribeAdminLearningData = null;
    }
}

function loadLearningDataForAdmin() {
    const listContainer = document.getElementById('data-list-container');
    listContainer.innerHTML = '로딩 중...';

    // 화면에 들어올 때마다 리스너가 중복으로 쌓이지 않도록 기존 리스너 해제 후 등록
    stopAdminLearningDataListener();
    unsubscribeAdminLearningData = onValue(ref(db, 'learningData'), (snapshot) => {
        const entries = [];
        snapshot.forEach((childSnapshot) => {
            entries.push({ id: childSnapshot.key, data: childSnapshot.val() });
        });
        renderAdminList(listContainer, entries, '등록된 학습 데이터가 없습니다.', ({ id, data }) =>
            renderAdminRow(data.title + ` (${data.questions.length}문항)`, {
                deleteConfirmMessage: `'${data.title}' 데이터를 삭제하시겠습니까?`,
                onDelete: () => remove(ref(db, `learningData/${id}`))
            })
        );
    }, (e) => {
        console.error(e);
        listContainer.innerHTML = '<div class="admin-row-empty">데이터 로딩 실패</div>';
    });
}


// ===================== 학생: 학습 데이터 선택 =====================

document.getElementById('btn-select-learning-data').addEventListener('click', () => {
    showModal(studentDataSelectModal);
    const listContainer = document.getElementById('student-data-list-container');
    listContainer.innerHTML = '로딩 중...';

    get(ref(db, 'learningData')).then((snapshot) => {
        const entries = [];
        snapshot.forEach((childSnapshot) => {
            entries.push({ id: childSnapshot.key, data: childSnapshot.val() });
        });
        renderAdminList(listContainer, entries, '등록된 학습 데이터가 없습니다. 선생님께 문의하세요.', ({ id, data }) =>
            renderAdminRow(data.title + ` (${data.questions.length}문항)`, {
                clickable: true,
                onClick: () => {
                    if (window.applyLearningData) {
                        window.applyLearningData(data.questions, data.title);
                    }
                    // 선택한 데이터를 계정에 저장 — 다음에 로그인해도 다시 고르지 않아도 됨
                    if (window.currentStudentId) {
                        update(ref(db, `students/${window.currentStudentId}`), {
                            selectedDataId: id
                        }).catch(e => console.error('학습 데이터 선택 저장 실패', e));
                    }
                    hideModal(studentDataSelectModal);
                    document.getElementById('btn-select-learning-data').textContent = "학습 데이터 변경";
                }
            })
        );
    }).catch(e => {
        listContainer.innerHTML = '<div class="admin-row-empty">데이터 로딩 실패</div>';
        console.error(e);
    });
});
