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

// Close buttons
document.getElementById('admin-login-close-btn').addEventListener('click', () => hideModal(adminLoginModal));
document.getElementById('student-login-close-btn').addEventListener('click', () => hideModal(studentLoginModal));
document.getElementById('admin-student-create-close-btn').addEventListener('click', () => hideModal(adminStudentCreateModal));
document.getElementById('admin-student-manage-close-btn').addEventListener('click', () => hideModal(adminStudentManageModal));
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

document.getElementById('btn-admin-manage-data').addEventListener('click', () => {
    setFieldFeedback(document.getElementById('data-upload-feedback'), '');
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
        listContainer.innerHTML = '';
        if (!snapshot.exists()) {
            listContainer.innerHTML = '<div class="admin-row-empty">등록된 학습 데이터가 없습니다.</div>';
            return;
        }
        
        snapshot.forEach((childSnapshot) => {
            const dataId = childSnapshot.key;
            const data = childSnapshot.val();
            
            const row = document.createElement('div');
            row.className = 'admin-row';
            
            const titleSpan = document.createElement('span');
            titleSpan.className = 'admin-row-name';
            titleSpan.textContent = data.title + ` (${data.questions.length}문항)`;
            
            const delBtn = document.createElement('button');
            delBtn.textContent = '삭제';
            delBtn.className = 'dex-settings-action-btn dex-danger dex-danger-sm';
            delBtn.onclick = async () => {
                if(confirm(`'${data.title}' 데이터를 삭제하시겠습니까?`)) {
                    await remove(ref(db, `learningData/${dataId}`));
                }
            };
            
            row.appendChild(titleSpan);
            row.appendChild(delBtn);
            listContainer.appendChild(row);
        });
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
        
    } catch (e) {
        console.error(e);
        setFieldFeedback(feedbackEl, '로그인 실패: ' + e.message, 'error');
    }
});

document.getElementById('btn-student-logout').addEventListener('click', () => {
    window.currentStudentId = null;
    // Pokedex 초기화 (로그아웃 시 로컬 도감을 비워야 함)
    if (window.resetPokedexLocal) window.resetPokedexLocal();
    switchScreen(loginScreen);
});

// Student Select Learning Data
document.getElementById('btn-select-learning-data').addEventListener('click', () => {
    showModal(studentDataSelectModal);
    const listContainer = document.getElementById('student-data-list-container');
    listContainer.innerHTML = '로딩 중...';
    
    get(ref(db, 'learningData')).then((snapshot) => {
        listContainer.innerHTML = '';
        if (!snapshot.exists()) {
            listContainer.innerHTML = '<div class="admin-row-empty">등록된 학습 데이터가 없습니다. 선생님께 문의하세요.</div>';
            return;
        }
        
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            
            const row = document.createElement('div');
            row.className = 'admin-row clickable';
            
            const titleSpan = document.createElement('span');
            titleSpan.className = 'admin-row-name';
            titleSpan.textContent = data.title + ` (${data.questions.length}문항)`;
            row.appendChild(titleSpan);
            
            row.onclick = () => {
                if (window.applyLearningData) {
                    window.applyLearningData(data.questions, data.title);
                }
                hideModal(studentDataSelectModal);
                document.getElementById('btn-select-learning-data').textContent = "학습 데이터 변경";
            };
            
            listContainer.appendChild(row);
        });
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
        listContainer.innerHTML = '';
        
        if (!snapshot.exists()) {
            listContainer.innerHTML = '<div class="admin-row-empty">학생 계정이 없습니다.</div>';
            return;
        }
        
        const users = snapshot.val();
        let hasStudents = false;
        
        for (const [id, data] of Object.entries(users)) {
            hasStudents = true;
            const row = document.createElement('div');
            row.className = 'admin-row';
            
            const titleSpan = document.createElement('span');
            titleSpan.className = 'admin-row-name';
            titleSpan.textContent = id;
            
            const delBtn = document.createElement('button');
            delBtn.className = 'dex-settings-action-btn dex-danger dex-danger-sm';
            delBtn.textContent = '삭제';
            
            delBtn.onclick = async () => {
                if (confirm(`'${id}' 학생 계정을 삭제하시겠습니까?`)) {
                    await window.firebaseRemove(window.firebaseRef(db, `users/${id}`));
                    row.remove();
                }
            };
            
            row.appendChild(titleSpan);
            row.appendChild(delBtn);
            listContainer.appendChild(row);
        }
        
        if (!hasStudents) {
            listContainer.innerHTML = '<div class="admin-row-empty">학생 계정이 없습니다.</div>';
        }
        
    } catch (e) {
        console.error(e);
        listContainer.innerHTML = '<div class="admin-row-empty">오류 발생</div>';
    }
});
