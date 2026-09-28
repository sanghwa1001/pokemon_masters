import { db, auth, googleProvider, authPersistenceReady } from "./firebase_config.js";
import { ref, set, get, update, push, onValue, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";
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

// ---- 목록 창(.list-panel) 공용 — 학생 관리 / 학습 데이터 관리 / 학습 데이터 선택이 함께 씀 ----
// 도감 창과 같은 구성(맨 위 검색창, 목록 위 줄, 두 줄 칸)이라 칸 만들기·검색·체크박스 선택을 한 곳에 둠

const LIST_NO_RESULT_TEXT = '검색 결과가 없습니다'; // 도감 검색과 같은 문구

// 두 줄 칸 하나 — 첫 줄 main(흐리게: mutedMain, 옆에 작은 빨간 tag), 둘째 줄 sub(작은 회색).
// check가 있으면 줄 전체를 label로 만들어 왼쪽 체크박스를 넣음(check의 값들은 체크박스 data-*로),
// current면 지금 쓰는 항목 표시(✓ 배지), onClick이면 줄을 눌렀을 때 실행. 검색은 searchText로 함
function renderTwoLineRow({ main, sub, mutedMain, tag, check, current, onClick, searchText }) {
    const row = document.createElement(check ? 'label' : 'div');
    row.className = 'admin-row admin-row-two-line clickable' + (current ? ' is-current' : '');
    row.dataset.search = String(searchText !== undefined ? searchText : `${main} ${sub}`).toLowerCase();

    if (check) {
        const box = document.createElement('input');
        box.type = 'checkbox';
        box.className = 'admin-row-check';
        Object.entries(check).forEach(([k, v]) => { if (v !== undefined && v !== null) box.dataset[k] = v; });
        row.appendChild(box);
    }

    const text = document.createElement('span');
    text.className = 'admin-row-name';
    const mainLine = document.createElement('span');
    mainLine.className = mutedMain ? 'admin-row-main admin-row-muted' : 'admin-row-main';
    mainLine.textContent = main;
    if (tag) {
        const tagEl = document.createElement('span');
        tagEl.className = 'admin-row-tag';
        tagEl.textContent = tag;
        mainLine.appendChild(tagEl);
    }
    const subLine = document.createElement('span');
    subLine.className = 'admin-row-sub';
    subLine.textContent = sub;
    text.appendChild(mainLine);
    text.appendChild(subLine);
    row.appendChild(text);

    if (onClick) row.addEventListener('click', onClick);
    return row;
}

// 검색어가 들어 있지 않은 칸은 숨기고, 보이는 칸이 하나도 없으면 "검색 결과가 없습니다"
// (목록 자체가 비어 있을 때의 안내는 renderAdminList가 따로 보여줌)
function applyListSearch(listEl, query) {
    const q = String(query || '').trim().toLowerCase();
    const rows = Array.from(listEl.querySelectorAll('.admin-row'));
    let shown = 0;
    rows.forEach(row => {
        const hit = !q || (row.dataset.search || '').includes(q);
        row.classList.toggle('hidden', !hit);
        if (hit) shown++;
    });
    let noResult = listEl.querySelector('.list-no-result');
    if (rows.length && !shown) {
        if (!noResult) {
            noResult = document.createElement('div');
            noResult.className = 'admin-row-empty list-no-result';
            noResult.textContent = LIST_NO_RESULT_TEXT;
            listEl.appendChild(noResult);
        }
    } else if (noResult) {
        noResult.remove();
    }
}

// 체크박스로 고르는 목록 — "전체 선택"과 실행 버튼(한 개 이상 골랐을 때만 누를 수 있음)을 목록에 맞춤.
// 대상은 보이는(검색에 걸린) 칸만이라, 전체 선택·삭제가 검색 결과에만 적용됨
function createSelectionControls(listEl, selectAllEl, actionBtn) {
    const checkboxes = () => Array.from(listEl.querySelectorAll('.admin-row:not(.hidden) .admin-row-check'));
    const refresh = () => {
        const boxes = checkboxes();
        const checked = boxes.filter(b => b.checked).length;
        selectAllEl.checked = boxes.length > 0 && checked === boxes.length;
        selectAllEl.indeterminate = checked > 0 && checked < boxes.length;
        selectAllEl.disabled = boxes.length === 0;
        actionBtn.disabled = checked === 0;
    };
    const clear = () => {
        listEl.querySelectorAll('.admin-row-check').forEach(b => { b.checked = false; });
        refresh();
    };
    listEl.addEventListener('change', (e) => {
        if (e.target.classList.contains('admin-row-check')) refresh();
    });
    selectAllEl.addEventListener('change', () => {
        checkboxes().forEach(b => { b.checked = selectAllEl.checked; });
        refresh();
    });
    return { checkboxes, refresh, clear };
}

// 목록 창의 검색창 — 검색어가 바뀌면(보이지 않는 항목이 지워지지 않도록) 선택을 모두 풀고 다시 거름
function bindListSearch(inputEl, listEl, selection) {
    inputEl.addEventListener('input', () => {
        applyListSearch(listEl, inputEl.value);
        if (selection) selection.clear();
    });
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
            // 관리자가 학생 모드로 대전하다 새로고침했으면 대시보드 대신 학생 모드로 바로 복귀
            const activeRoom = (await get(ref(db, `students/${user.uid}/activeRoom`)).catch(() => null));
            if (token !== authRouteToken) return;
            if (activeRoom && activeRoom.val()) {
                adminStudentMode = true;
                studentLogoutBtn.textContent = '관리자 메뉴';
                await startStudentSession(user, user.displayName || '', token);
                return;
            }
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
let currentSelectedDataId = null; // 지금 쓰고 있는 학습 데이터(학습 데이터 선택 창의 ✓ 표시용)
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
    if (data.pokedex && window.loadPokedexFromFirebase) window.loadPokedexFromFirebase(data.pokedex);

    // 진행 중이던 함께하기 대전이 있으면(새로고침·탭 닫힘) 자동으로 복귀 — 그동안은 지금 화면
    // ("계정 확인 중...")을 그대로 두고, 복귀에 성공하면 복원된 배틀/선택 화면이 바로 보이게 함.
    // 복귀할 수 없으면(시간 초과·방 없음) 문구 없이 평소처럼 시작화면
    let rejoined = false;
    if (data.activeRoom && window.mpTryRejoin) {
        rejoined = await window.mpTryRejoin(data.activeRoom);
        if (token !== authRouteToken) return;
    }
    setFieldFeedback(loginFeedbackEl, '');
    if (rejoined) {
        [loginScreen, startScreen, adminDashboard].forEach(el => el && el.classList.add('hidden'));
    } else {
        switchScreen(startScreen);
    }

    // 이전에 선택해둔 학습 데이터가 있으면 다시 고르지 않아도 자동으로 적용
    // (선택을 바꾸기 전까지는 계정에 남아있어 다음 로그인에도 계속 유지됨)
    currentSelectedDataId = data.selectedDataId || null;
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
    currentSelectedDataId = null;
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


// ===================== 관리자: 등록 입력 상자 공용 (학생 등록·학습 데이터 등록) =====================
// 두 창 모두 큰 입력 상자에 한 줄에 한 개씩 "첫 칸, 둘째 칸"을 적음 — 탭이 있으면 탭, 없으면 첫 쉼표에서만
// 나눔(뜻에 쉼표가 자주 들어가서 "서비스, 근무, 봉사"가 잘리지 않게). 칸마다 앞뒤 공백 제거

function splitRegisterLine(line) {
    if (line.includes('\t')) return line.split('\t').map(c => c.trim());
    const i = line.indexOf(',');
    return (i < 0 ? [line] : [line.slice(0, i), line.slice(i + 1)]).map(c => c.trim());
}

// 빈 줄을 뺀 줄 목록(원문 그대로)
function nonBlankLines(text) {
    return text.split(/\r?\n/).filter(line => line.trim() !== '');
}

// 엑셀 첫 시트를 행 배열로 읽음(빈 행 제외) — 각 행은 { cells, raw("칸 [탭] 칸") }
function readSheetRows(arrayBuffer) {
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
    return rows.filter(Array.isArray)
        .map(r => Array.from(r, c => String(c ?? '').trim()))
        .filter(cells => cells.some(c => c !== ''))
        .map(cells => ({ cells, raw: cells.join('\t').replace(/\t+$/, '') }));
}

// 상자 공통 동작 — Tab 키는 다음 버튼으로 넘어가는 대신 탭 문자 입력, 고치기 시작하면 빨간 글자 해제
function setupRegisterInput(inputEl) {
    inputEl.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab' || e.shiftKey || e.isComposing) return;
        e.preventDefault();
        inputEl.setRangeText('\t', inputEl.selectionStart, inputEl.selectionEnd, 'end');
        inputEl.classList.remove('has-error');
    });
    inputEl.addEventListener('input', () => inputEl.classList.remove('has-error'));
}

function setRegisterInputText(inputEl, text, hasError) {
    inputEl.value = text;
    inputEl.classList.toggle('has-error', hasError);
}

// 엑셀 버튼 → 숨은 파일 입력을 열고, 고른 파일을 onFile(arrayBuffer, fileName)로 넘김
function bindExcelPicker(buttonEl, fileEl, feedbackEl, onFile) {
    buttonEl.addEventListener('click', () => {
        fileEl.value = '';
        fileEl.click();
    });
    fileEl.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                onFile(evt.target.result, file.name);
            } catch (err) {
                console.error(err);
                setFieldFeedback(feedbackEl, '파일을 읽을 수 없습니다', 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    });
}


// ===================== 관리자: 학생 등록 =====================

// 영문·숫자 이메일만 허용(구글 계정 이메일은 ASCII) — 한글·전각 쉼표(，) 등이 붙은 줄이 이메일로
// 잘못 저장되지 않게 함
const EMAIL_RE = /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const studentCreateFeedbackEl = document.getElementById('admin-student-create-feedback');
const studentRegisterInputEl = document.getElementById('student-register-input');
const studentRegisterBtn = document.getElementById('btn-register-students');
const studentRegisterExcelBtn = document.getElementById('btn-register-students-excel');
const studentRegisterFileEl = document.getElementById('student-register-file');
setupRegisterInput(studentRegisterInputEl);

document.getElementById('btn-admin-create-student').addEventListener('click', () => {
    setFieldFeedback(studentCreateFeedbackEl, '');
    setRegisterInputText(studentRegisterInputEl, '', false);
    showModal(adminStudentCreateModal);
    studentRegisterInputEl.focus();
});

// [{ email, name, raw }] 목록을 allowedStudents에 추가하고 { added, duplicate, invalidRaws }를 돌려줌 —
// 목록 안 중복·이미 등록된 이메일은 건너뛰고, 형식 오류 줄은 원문(raw)을 모아 돌려줌(머리글 줄도
// 따로 판별하지 않고 형식 오류로 처리 — 입력 상자에 남으니 무엇인지 바로 보임)
async function addStudents(entries) {
    const existing = (await get(ref(db, 'allowedStudents'))).val() || {};
    const updates = {};
    const invalidRaws = [];
    let duplicate = 0;
    const now = Date.now();
    entries.forEach(({ email, name, raw }) => {
        if (!EMAIL_RE.test(email)) { invalidRaws.push(raw); return; }
        const key = emailKeyOf(email);
        if (existing[key] || updates[key]) { duplicate++; return; }
        const entry = { email: email.toLowerCase(), addedAt: now };
        if (name) entry.name = name.slice(0, 100);
        updates[key] = entry;
    });
    const added = Object.keys(updates).length;
    if (added) await update(ref(db, 'allowedStudents'), updates);
    return { added, duplicate, invalidRaws };
}

// 입력 상자와 엑셀 공용 — 결과를 "N명이 등록되었습니다 (중복 N, 오류 N)"으로 알리고, 형식이 틀린 줄만
// 입력 상자에 빨간 글자로 남김(등록·중복 줄은 지움). 저장 실패 시 상자는 그대로 둬서 다시 누를 수 있게 함
async function registerStudentEntries(entries) {
    if (!entries.length) {
        setFieldFeedback(studentCreateFeedbackEl, '등록할 이메일이 없습니다', 'error');
        return;
    }
    studentRegisterBtn.disabled = studentRegisterExcelBtn.disabled = true;
    setFieldFeedback(studentCreateFeedbackEl, '등록 중...');
    try {
        const { added, duplicate, invalidRaws } = await addStudents(entries);
        const invalid = invalidRaws.length;
        // 치트 코드 안내처럼 결과만 한 문장으로 — 건너뛴 줄이 있으면 괄호로 개수만 덧붙임
        const skipped = [duplicate ? `중복 ${duplicate}` : '', invalid ? `오류 ${invalid}` : ''].filter(Boolean).join(', ');
        if (added) {
            setFieldFeedback(studentCreateFeedbackEl, `${added}명이 등록되었습니다` + (skipped ? ` (${skipped})` : ''), 'success');
        } else {
            setFieldFeedback(studentCreateFeedbackEl, invalid ? `등록된 학생이 없습니다 (${skipped})` : '이미 등록된 이메일입니다', 'error');
        }
        setRegisterInputText(studentRegisterInputEl, invalidRaws.join('\n'), invalid > 0);
    } catch (e) {
        console.error(e);
        setFieldFeedback(studentCreateFeedbackEl, '등록하지 못했습니다', 'error');
    }
    studentRegisterBtn.disabled = studentRegisterExcelBtn.disabled = false;
}

const toStudentEntry = (cells, raw) => ({ email: cells[0] ?? '', name: cells[1] ?? '', raw });

studentRegisterBtn.addEventListener('click', () => {
    registerStudentEntries(nonBlankLines(studentRegisterInputEl.value)
        .map(line => toStudentEntry(splitRegisterLine(line), line)));
});

// 엑셀 — 첫 번째 시트의 첫 열 이메일, 둘째 열 이름. 형식이 틀린 행은 "이메일 [탭] 이름" 줄로 입력 상자에 채워짐
bindExcelPicker(studentRegisterExcelBtn, studentRegisterFileEl, studentCreateFeedbackEl, (buffer) => {
    registerStudentEntries(readSheetRows(buffer).map(({ cells, raw }) => toStudentEntry(cells, raw)));
});


// ===================== 관리자: 학생 관리 =====================
// 도감 목록과 같은 구성 — 위쪽 줄 "전체 선택"(도감의 "잡음"과 같은 체크박스) + 인원수, 각 줄 왼쪽
// 체크박스로 골라 아래 "삭제하기"로 삭제

const studentListContainer = document.getElementById('student-list-container');
const studentCountEl = document.getElementById('student-count');
const studentSelectAllEl = document.getElementById('student-select-all');
const studentDeleteBtn = document.getElementById('btn-delete-students');
const studentDeleteFeedbackEl = document.getElementById('student-delete-feedback');
const studentSearchInputEl = document.getElementById('student-search-input');
const studentSelection = createSelectionControls(studentListContainer, studentSelectAllEl, studentDeleteBtn);
bindListSearch(studentSearchInputEl, studentListContainer, studentSelection);

// 한 줄: [체크박스] 이름(없으면 흐린 "이름 없음") · 아직 로그인 전이면 "미접속" / 둘째 줄 아이디(이메일)
function renderStudentRow({ key, data }) {
    return renderTwoLineRow({
        main: data.name || '이름 없음',
        mutedMain: !data.name,
        tag: data.uid ? null : '미접속',
        sub: data.email,
        searchText: `${data.name || ''} ${data.email}`,
        check: { key, email: data.email, uid: data.uid }
    });
}

async function loadStudentList() {
    studentListContainer.innerHTML = '로딩 중...';
    studentSelection.refresh();
    try {
        const snapshot = await get(ref(db, 'allowedStudents'));
        const entries = Object.entries(snapshot.val() || {})
            .map(([key, data]) => ({ key, data }))
            .sort((a, b) => (a.data.name || a.data.email).localeCompare(b.data.name || b.data.email, 'ko'));
        studentCountEl.textContent = `${entries.length}명`;
        renderAdminList(studentListContainer, entries, '등록된 학생이 없습니다', renderStudentRow);
        applyListSearch(studentListContainer, studentSearchInputEl.value);
    } catch (e) {
        console.error(e);
        studentCountEl.textContent = '0명';
        studentListContainer.innerHTML = '<div class="admin-row-empty">학생 목록을 불러올 수 없습니다</div>';
    }
    studentSelection.refresh();
}

document.getElementById('btn-admin-manage-students').addEventListener('click', () => {
    setFieldFeedback(studentDeleteFeedbackEl, '');
    studentSearchInputEl.value = '';
    showModal(adminStudentManageModal);
    loadStudentList();
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
    const selected = studentSelection.checkboxes().filter(b => b.checked);
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
    setFieldFeedback(dataRegisterFeedbackEl, '');
    setRegisterInputText(dataRegisterInputEl, '', false);
    heldData = null;
    showModal(adminDataUploadModal);
    dataRegisterInputEl.focus();
});

document.getElementById('btn-admin-manage-data').addEventListener('click', () => {
    setFieldFeedback(dataDeleteFeedbackEl, '');
    dataSearchInputEl.value = '';
    showModal(adminDataManageModal);
    loadLearningDataForAdmin();
});

// 학습 데이터 등록 — 학생 등록과 같은 입력 상자. 첫 줄은 데이터 이름, 둘째 줄부터 "영어, 뜻".
// 학생과 달리 한 묶음으로 저장되므로, 틀린 줄이 하나라도 있으면 저장하지 않고 정상 줄은 원래 자리와 함께
// 데이터 이름과 함께 보관(heldData)한 채 상자에는 틀린 줄만 빨간 글자로 남김(학생 등록과 같음 — 이름 줄까지
// 상자에 두면 상자 전체가 빨개져 이름도 틀린 줄처럼 보임) → 고쳐서 다시 등록하면 보관한 이름·줄과 합쳐
// 한 묶음으로 저장. 보관은 창 안 임시 메모리라 창을 다시 열거나 새로고침하면 비워짐
const dataRegisterInputEl = document.getElementById('data-register-input');
const dataRegisterFeedbackEl = document.getElementById('data-register-feedback');
const dataRegisterBtn = document.getElementById('btn-register-data');
const dataRegisterExcelBtn = document.getElementById('btn-register-data-excel');
const dataRegisterFileEl = document.getElementById('data-register-file');
setupRegisterInput(dataRegisterInputEl);

// { title, slots } — slots는 원래 순서대로의 칸 목록(정상 줄 { en, kr, raw } 또는 틀린 줄 { raw, error: true })
let heldData = null;

const HANGUL_RE = /[ㄱ-ㅎㅏ-ㅣ가-힣]/;
// 영어 칸은 영문자가 있고 한글이 없어야, 뜻 칸은 한글이 있어야 정상 — 칸 빠짐, 순서 반대, 머리글("영어, 뜻",
// "word, meaning") 등이 틀린 줄로 드러남
function toWordSlot(cells, raw) {
    const en = cells[0] ?? '', kr = cells[1] ?? '';
    const ok = /[A-Za-z]/.test(en) && !HANGUL_RE.test(en) && HANGUL_RE.test(kr);
    return ok ? { en, kr, raw } : { raw, error: true };
}

// 틀린 줄의 첫 칸(영어 자리) — 고친 줄을 원래 자리에 맞출 때 비교에 씀
const slotKey = (raw) => (splitRegisterLine(raw)[0] || '').toLowerCase();

// 보관한 칸 목록에 상자의 고친 줄들을 합침 — 고친 줄 수가 틀린 줄 수와 같으면 순서대로 원래 자리에 넣고,
// 다르면(줄을 지우거나 추가함) 첫 칸이 같은 틀린 줄을 순서대로 찾아 그 자리에 넣음. 짝이 없는 틀린 줄의
// 자리는 버리고, 짝이 없는 고친 줄은 맨 뒤에 붙임
function mergeFixedLines(slots, fixedLines) {
    const errorIdx = slots.map((s, i) => (s.error ? i : -1)).filter(i => i >= 0);
    const fixedSlots = fixedLines.map(line => toWordSlot(splitRegisterLine(line), line));
    const placed = new Map(); // 틀린 줄 자리 → 고친 칸
    const appended = [];
    if (fixedSlots.length === errorIdx.length) {
        errorIdx.forEach((slotIdx, k) => placed.set(slotIdx, fixedSlots[k]));
    } else {
        let from = 0;
        fixedSlots.forEach((fixed) => {
            const key = slotKey(fixed.raw);
            const k = errorIdx.findIndex((slotIdx, j) => j >= from && slotKey(slots[slotIdx].raw) === key);
            if (k < 0) { appended.push(fixed); return; }
            placed.set(errorIdx[k], fixed);
            from = k + 1;
        });
    }
    return slots.flatMap((s, i) => (s.error ? (placed.has(i) ? [placed.get(i)] : []) : [s])).concat(appended);
}

async function registerLearningData(title, slots) {
    const errors = slots.filter(s => s.error);
    if (errors.length) {
        heldData = { title, slots };
        setRegisterInputText(dataRegisterInputEl, errors.map(s => s.raw).join('\n'), true);
        setFieldFeedback(dataRegisterFeedbackEl, `등록하지 못했습니다 (오류 ${errors.length})`, 'error');
        return;
    }
    const distinctMeanings = new Set(slots.map(s => s.kr)).size;
    if (distinctMeanings < QUIZ_MIN_WORDS) {
        // 단어를 더 적을 수 있게 보관한 줄까지 전부 상자로 되돌림
        heldData = null;
        setRegisterInputText(dataRegisterInputEl, [title, ...slots.map(s => s.raw)].join('\n'), false);
        setFieldFeedback(dataRegisterFeedbackEl, `뜻이 다른 단어가 ${QUIZ_MIN_WORDS}개 이상 필요합니다 (현재 ${distinctMeanings}개)`, 'error');
        return;
    }
    dataRegisterBtn.disabled = dataRegisterExcelBtn.disabled = true;
    setFieldFeedback(dataRegisterFeedbackEl, '등록 중...');
    try {
        await set(push(ref(db, 'learningData')), {
            title: title.slice(0, 100),
            questions: slots.map(({ en, kr }) => ({ en, kr }))
        });
        heldData = null;
        setRegisterInputText(dataRegisterInputEl, '', false);
        setFieldFeedback(dataRegisterFeedbackEl, `${slots.length}문항이 등록되었습니다`, 'success');
    } catch (e) {
        // 합친 전체를 상자로 되돌려 등록하기로 다시 시도할 수 있게 함(엑셀로 올린 경우도 상자에서 이어서)
        console.error(e);
        heldData = null;
        setRegisterInputText(dataRegisterInputEl, [title, ...slots.map(s => s.raw)].join('\n'), false);
        setFieldFeedback(dataRegisterFeedbackEl, '등록하지 못했습니다', 'error');
    }
    dataRegisterBtn.disabled = dataRegisterExcelBtn.disabled = false;
}

// 입력 상자 — 글자가 있는 첫 줄은 데이터 이름(쉼표가 있어도 통째로), 둘째 줄부터 단어. 틀린 줄을 고치는
// 중(보관 있음)이면 상자의 모든 줄이 고친 줄이고 이름은 보관한 것을 씀
dataRegisterBtn.addEventListener('click', () => {
    const lines = nonBlankLines(dataRegisterInputEl.value);
    if (heldData) {
        registerLearningData(heldData.title, mergeFixedLines(heldData.slots, lines));
        return;
    }
    const [titleLine = '', ...wordLines] = lines;
    registerLearningData(titleLine.trim() || '제목 없음',
        wordLines.map(line => toWordSlot(splitRegisterLine(line), line)));
});

// 엑셀 — 파일 이름(확장자 제외)이 데이터 이름, 첫 열 영어, 둘째 열 뜻(파일 안 쉼표는 칸 구분에 안 씀).
// 새 파일은 새 등록이라 보관 중이던 줄은 버림
bindExcelPicker(dataRegisterExcelBtn, dataRegisterFileEl, dataRegisterFeedbackEl, (buffer, fileName) => {
    const title = fileName.replace(/\.[^.]+$/, '').trim() || '제목 없음';
    const slots = readSheetRows(buffer).map(({ cells, raw }) => toWordSlot(cells, raw));
    heldData = null;
    registerLearningData(title, slots);
});

let unsubscribeAdminLearningData = null;
function stopAdminLearningDataListener() {
    if (unsubscribeAdminLearningData) {
        unsubscribeAdminLearningData();
        unsubscribeAdminLearningData = null;
    }
}

// 학습 데이터 관리 — 학생 관리와 같은 목록 창(검색, "전체 선택 / N개", 체크박스 + 아래 삭제하기)
const dataListContainer = document.getElementById('data-list-container');
const dataCountEl = document.getElementById('data-count');
const dataSelectAllEl = document.getElementById('data-select-all');
const dataDeleteBtn = document.getElementById('btn-delete-data');
const dataDeleteFeedbackEl = document.getElementById('data-delete-feedback');
const dataSearchInputEl = document.getElementById('data-search-input');
const dataSelection = createSelectionControls(dataListContainer, dataSelectAllEl, dataDeleteBtn);
bindListSearch(dataSearchInputEl, dataListContainer, dataSelection);

function loadLearningDataForAdmin() {
    dataListContainer.innerHTML = '로딩 중...';
    dataSelection.refresh();

    // 화면에 들어올 때마다 리스너가 중복으로 쌓이지 않도록 기존 리스너 해제 후 등록
    stopAdminLearningDataListener();
    unsubscribeAdminLearningData = onValue(ref(db, 'learningData'), (snapshot) => {
        const entries = [];
        snapshot.forEach((childSnapshot) => {
            entries.push({ id: childSnapshot.key, data: childSnapshot.val() });
        });
        dataCountEl.textContent = `${entries.length}개`;
        renderAdminList(dataListContainer, entries, '등록된 학습 데이터가 없습니다.', ({ id, data }) =>
            renderTwoLineRow({
                main: data.title,
                sub: `${(data.questions || []).length}문항`,
                searchText: data.title,
                check: { id }
            })
        );
        applyListSearch(dataListContainer, dataSearchInputEl.value);
        dataSelection.refresh();
    }, (e) => {
        console.error(e);
        dataCountEl.textContent = '0개';
        dataListContainer.innerHTML = '<div class="admin-row-empty">데이터 로딩 실패</div>';
        dataSelection.refresh();
    });
}

// 고른 학습 데이터를 한 번에 삭제(다중 경로 update — 중간에 실패해도 일부만 지워지지 않음).
// 실시간 목록이라 지워지면 목록은 자동으로 다시 그려짐
dataDeleteBtn.addEventListener('click', async () => {
    const selected = dataSelection.checkboxes().filter(b => b.checked);
    if (!selected.length) return;
    if (!confirm(`${selected.length}개를 삭제하시겠습니까?\n되돌릴 수 없습니다`)) return;
    dataDeleteBtn.disabled = true;
    setFieldFeedback(dataDeleteFeedbackEl, '삭제 중...');
    try {
        const updates = {};
        selected.forEach(b => { updates[`learningData/${b.dataset.id}`] = null; });
        await update(ref(db), updates);
        setFieldFeedback(dataDeleteFeedbackEl, `${selected.length}개가 삭제되었습니다`, 'success');
    } catch (e) {
        console.error(e);
        setFieldFeedback(dataDeleteFeedbackEl, '삭제하지 못했습니다', 'error');
    }
    dataSelection.refresh();
});


// ===================== 학생: 학습 데이터 선택 =====================

// 같은 목록 창 — 검색, "N개", 두 줄 칸. 지금 쓰고 있는 데이터 줄에는 ✓ 배지(도감 파티 선택과 같음)
const studentDataListContainer = document.getElementById('student-data-list-container');
const studentDataCountEl = document.getElementById('student-data-count');
const studentDataSearchInputEl = document.getElementById('student-data-search-input');
bindListSearch(studentDataSearchInputEl, studentDataListContainer, null);

document.getElementById('btn-select-learning-data').addEventListener('click', () => {
    studentDataSearchInputEl.value = '';
    showModal(studentDataSelectModal);
    studentDataListContainer.innerHTML = '로딩 중...';

    get(ref(db, 'learningData')).then((snapshot) => {
        const entries = [];
        snapshot.forEach((childSnapshot) => {
            entries.push({ id: childSnapshot.key, data: childSnapshot.val() });
        });
        studentDataCountEl.textContent = `${entries.length}개`;
        renderAdminList(studentDataListContainer, entries, '등록된 학습 데이터가 없습니다. 선생님께 문의하세요.', ({ id, data }) =>
            renderTwoLineRow({
                main: data.title,
                sub: `${(data.questions || []).length}문항`,
                searchText: data.title,
                current: id === currentSelectedDataId,
                onClick: () => {
                    if (window.applyLearningData) {
                        window.applyLearningData(data.questions, data.title);
                    }
                    currentSelectedDataId = id;
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
        applyListSearch(studentDataListContainer, studentDataSearchInputEl.value);
    }).catch(e => {
        studentDataCountEl.textContent = '0개';
        studentDataListContainer.innerHTML = '<div class="admin-row-empty">데이터 로딩 실패</div>';
        console.error(e);
    });
});
