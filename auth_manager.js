import { db } from "./firebase_config.js";
import { ref, set, get, child, push, remove, onValue } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const startScreen = document.getElementById('start-screen');
const adminDashboard = document.getElementById('admin-dashboard-screen');

// Modals — 관리자 대시보드의 세 버튼(학생 계정 생성/관리, 학습 데이터 관리)이 여는 창은
// 전부 같은 방식(.mp-modal/.mp-box, 대시보드를 가리지 않고 위에 떠서 열리고 ×로 닫힘)으로 통일함
const adminLoginModal = document.getElementById('admin-login-modal');
const studentLoginModal = document.getElementById('student-login-modal');
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

// 관리자/학생 쪽 목록(학습 데이터 관리, 학습 데이터 선택, 학생 계정 관리) 세 곳이 전부
// "이름 + (있으면) 삭제 버튼" 또는 "줄 전체 클릭"이라는 같은 모양의 .admin-row 한 줄을
// 각자 손으로 다시 만들고 있어서 공용으로 뽑음 — 세 목록이 서로 달라지면(예: 삭제 버튼
// 문구/스타일) 한 곳만 고치면 되도록 함
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
document.getElementById('admin-login-close-btn').addEventListener('click', () => hideModal(adminLoginModal));
document.getElementById('student-login-close-btn').addEventListener('click', () => hideModal(studentLoginModal));
document.getElementById('admin-student-create-close-btn').addEventListener('click', () => hideModal(adminStudentCreateModal));
document.getElementById('admin-student-manage-close-btn').addEventListener('click', () => hideModal(adminStudentManageModal));
document.getElementById('admin-data-upload-close-btn').addEventListener('click', () => hideModal(adminDataUploadModal));
document.getElementById('admin-data-manage-close-btn').addEventListener('click', () => {
    stopAdminLearningDataListener();
    hideModal(adminDataManageModal);
});
document.getElementById('student-data-select-close-btn').addEventListener('click', () => hideModal(studentDataSelectModal));

// Login Screen Buttons
document.getElementById('btn-show-student-login').addEventListener('click', () => {
    setFieldFeedback(document.getElementById('student-login-feedback'), '');
    showModal(studentLoginModal);
});
document.getElementById('btn-show-admin-login').addEventListener('click', () => {
    setFieldFeedback(document.getElementById('admin-login-feedback'), '');
    showModal(adminLoginModal);
});

// --- Admin Logic ---
const ADMIN_PW = "1234";

document.getElementById('btn-admin-login').addEventListener('click', () => {
    const feedbackEl = document.getElementById('admin-login-feedback');
    const pw = document.getElementById('admin-pw-input').value;
    if (pw === ADMIN_PW) {
        setFieldFeedback(feedbackEl, '');
        hideModal(adminLoginModal);
        document.getElementById('admin-pw-input').value = '';
        loginScreen.classList.add('hidden');
        switchScreen(adminDashboard);
    } else {
        setFieldFeedback(feedbackEl, '비밀번호가 틀렸습니다.', 'error');
    }
});

document.getElementById('btn-admin-logout').addEventListener('click', () => {
    stopAdminLearningDataListener();
    switchScreen(loginScreen);
});

document.getElementById('btn-admin-create-student').addEventListener('click', () => {
    setFieldFeedback(document.getElementById('admin-student-create-feedback'), '');
    showModal(adminStudentCreateModal);
});

document.getElementById('btn-admin-upload-data').addEventListener('click', () => {
    setFieldFeedback(document.getElementById('data-upload-feedback'), '');
    showModal(adminDataUploadModal);
});

document.getElementById('btn-admin-manage-data').addEventListener('click', () => {
    showModal(adminDataManageModal);
    loadLearningDataForAdmin();
});

// Student Create (Admin)
document.getElementById('btn-create-student-submit').addEventListener('click', async () => {
    const feedbackEl = document.getElementById('admin-student-create-feedback');
    const id = document.getElementById('new-student-id').value.trim();
    const pw = document.getElementById('new-student-pw').value.trim();
    
    if (!id || !pw) {
        setFieldFeedback(feedbackEl, '아이디와 비밀번호를 모두 입력해주세요.', 'error');
        return;
    }

    try {
        const userRef = ref(db, `users/${id}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            setFieldFeedback(feedbackEl, '이미 존재하는 아이디입니다.', 'error');
            return;
        }

        await set(userRef, { password: pw, pokedex: {} });
        setFieldFeedback(feedbackEl, '학생 계정이 생성되었습니다.', 'success');
        hideModal(adminStudentCreateModal);
        document.getElementById('new-student-id').value = '';
        document.getElementById('new-student-pw').value = '';
    } catch (e) {
        console.error(e);
        setFieldFeedback(feedbackEl, '계정 생성 실패: ' + e.message, 'error');
    }
});

// Excel Upload (Admin) -> Handled mostly by script.js but modified to save to Firebase
window.uploadLearningDataToFirebase = async function(parsedQuestions) {
    const title = document.getElementById('data-title-input').value.trim() || "제목 없음";
    const feedbackEl = document.getElementById('data-upload-feedback');
    try {
        const dataRef = ref(db, 'learningData');
        const newDataRef = push(dataRef);
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
    });
}


// --- Student Logic ---
window.currentStudentId = null;

document.getElementById('btn-student-login').addEventListener('click', async () => {
    const feedbackEl = document.getElementById('student-login-feedback');
    const id = document.getElementById('student-id-input').value.trim();
    const pw = document.getElementById('student-pw-input').value.trim();
    
    if (!id || !pw) {
        setFieldFeedback(feedbackEl, '아이디와 비밀번호를 모두 입력해주세요.', 'error');
        return;
    }
    
    try {
        const userRef = ref(db, `users/${id}`);
        const snapshot = await get(userRef);
        
        if (!snapshot.exists()) {
            setFieldFeedback(feedbackEl, '존재하지 않는 아이디입니다.', 'error');
            return;
        }
        
        const userData = snapshot.val();
        if (userData.password !== pw) {
            setFieldFeedback(feedbackEl, '비밀번호가 틀렸습니다.', 'error');
            return;
        }
        
        // Login Success
        setFieldFeedback(feedbackEl, '');
        window.currentStudentId = id;
        hideModal(studentLoginModal);
        loginScreen.classList.add('hidden'); // 로그인 창 명시적으로 숨김
        switchScreen(startScreen);
        
        // Load Pokedex Data
        if (userData.pokedex) {
            if (window.loadPokedexFromFirebase) {
                window.loadPokedexFromFirebase(userData.pokedex);
            }
        }
        
        // 이전에 선택해둔 학습 데이터가 있으면 다시 고르지 않아도 자동으로 적용
        // (선택을 바꾸기 전까지는 계정에 남아있어 다음 로그인에도 계속 유지됨)
        if (userData.selectedDataId) {
            try {
                const dataSnapshot = await get(ref(db, `learningData/${userData.selectedDataId}`));
                if (dataSnapshot.exists() && window.applyLearningData) {
                    const data = dataSnapshot.val();
                    window.applyLearningData(data.questions, data.title);
                    document.getElementById('btn-select-learning-data').textContent = "학습 데이터 변경";
                }
            } catch (e) {
                console.error('저장된 학습 데이터 불러오기 실패', e);
            }
        }
        
    } catch (e) {
        console.error(e);
        setFieldFeedback(feedbackEl, '로그인 실패: ' + e.message, 'error');
    }
});

document.getElementById('btn-student-logout').addEventListener('click', () => {
    window.currentStudentId = null;
    // Pokedex 초기화 (로그아웃 시 로컬 도감을 비워야 함)
    if (window.resetPokedexLocal) window.resetPokedexLocal();
    // 학습 데이터 선택 화면 표시도 초기화 — 실제 선택 기록(selectedDataId)은 계정에 남아있으므로
    // 다음에 같은 계정으로 로그인하면 다시 자동으로 적용됨
    if (window.resetLearningDataLocal) window.resetLearningDataLocal();
    document.getElementById('btn-select-learning-data').textContent = "학습 데이터 선택";
    switchScreen(loginScreen);
});

// Student Select Learning Data
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
                    if (window.currentStudentId && window.firebaseDb && window.firebaseUpdate) {
                        window.firebaseUpdate(window.firebaseRef(window.firebaseDb, `users/${window.currentStudentId}`), {
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

// --- 학생 계정 관리 ---

document.getElementById('btn-admin-manage-students').addEventListener('click', async () => {
    showModal(adminStudentManageModal);
    const listContainer = document.getElementById('student-list-container');
    listContainer.innerHTML = '로딩 중...';
    
    try {
        const usersRef = window.firebaseRef(db, 'users');
        const snapshot = await window.firebaseGet(usersRef);
        const entries = snapshot.exists()
            ? Object.entries(snapshot.val()).map(([id, data]) => ({ id, data }))
            : [];
        renderAdminList(listContainer, entries, '학생 계정이 없습니다.', ({ id }) =>
            renderAdminRow(id, {
                deleteConfirmMessage: `'${id}' 학생 계정을 삭제하시겠습니까?`,
                onDelete: () => window.firebaseRemove(window.firebaseRef(db, `users/${id}`))
            })
        );
    } catch (e) {
        console.error(e);
        listContainer.innerHTML = '<div class="admin-row-empty">오류 발생</div>';
    }
});
