import { db } from "./firebase_config.js";
import { ref, set, get, child, push, remove, onValue } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const startScreen = document.getElementById('start-screen');
const adminDashboard = document.getElementById('admin-dashboard-screen');
const adminDataManageScreen = document.getElementById('admin-data-manage-screen');
const adminStudentManageScreen = document.getElementById('admin-student-manage-screen');

// Modals
const adminLoginModal = document.getElementById('admin-login-modal');
const studentLoginModal = document.getElementById('student-login-modal');
const adminStudentCreateModal = document.getElementById('admin-student-create-modal');
const studentDataSelectModal = document.getElementById('student-data-select-modal');

// --- Navigation & Modal Helpers ---
function showModal(modal) { modal.classList.remove('hidden'); }
function hideModal(modal) { modal.classList.add('hidden'); }
function switchScreen(screen) {
    [loginScreen, startScreen, adminDashboard, adminDataManageScreen, adminStudentManageScreen].forEach(s => {
        if (s) s.classList.add('hidden');
    });
    screen.classList.remove('hidden');
}

// Close buttons
document.getElementById('admin-login-close-btn').addEventListener('click', () => hideModal(adminLoginModal));
document.getElementById('student-login-close-btn').addEventListener('click', () => hideModal(studentLoginModal));
document.getElementById('admin-student-create-close-btn').addEventListener('click', () => hideModal(adminStudentCreateModal));
document.getElementById('student-data-select-close-btn').addEventListener('click', () => hideModal(studentDataSelectModal));

// Login Screen Buttons
document.getElementById('btn-show-student-login').addEventListener('click', () => showModal(studentLoginModal));
document.getElementById('btn-show-admin-login').addEventListener('click', () => showModal(adminLoginModal));

// --- Admin Logic ---
const ADMIN_PW = "1234";

document.getElementById('btn-admin-login').addEventListener('click', () => {
    const pw = document.getElementById('admin-pw-input').value;
    if (pw === ADMIN_PW) {
        hideModal(adminLoginModal);
        document.getElementById('admin-pw-input').value = '';
        loginScreen.classList.add('hidden');
        switchScreen(adminDashboard);
    } else {
        alert("비밀번호가 틀렸습니다.");
    }
});

document.getElementById('btn-admin-logout').addEventListener('click', () => {
    switchScreen(loginScreen);
});

document.getElementById('btn-admin-create-student').addEventListener('click', () => {
    showModal(adminStudentCreateModal);
});

document.getElementById('btn-admin-manage-data').addEventListener('click', () => {
    switchScreen(adminDataManageScreen);
    loadLearningDataForAdmin();
});

document.getElementById('btn-data-manage-back').addEventListener('click', () => {
    switchScreen(adminDashboard);
});

// Student Create (Admin)
document.getElementById('btn-create-student-submit').addEventListener('click', async () => {
    const id = document.getElementById('new-student-id').value.trim();
    const pw = document.getElementById('new-student-pw').value.trim();
    
    if (!id || !pw) {
        alert("아이디와 비밀번호를 모두 입력해주세요.");
        return;
    }

    try {
        const userRef = ref(db, `users/${id}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            alert("이미 존재하는 아이디입니다.");
            return;
        }

        await set(userRef, { password: pw, pokedex: {} });
        alert("학생 계정이 생성되었습니다.");
        hideModal(adminStudentCreateModal);
        document.getElementById('new-student-id').value = '';
        document.getElementById('new-student-pw').value = '';
    } catch (e) {
        console.error(e);
        alert("계정 생성 실패: " + e.message);
    }
});

// Excel Upload (Admin) -> Handled mostly by script.js but modified to save to Firebase
window.uploadLearningDataToFirebase = async function(parsedQuestions) {
    const title = document.getElementById('data-title-input').value.trim() || "제목 없음";
    try {
        const dataRef = ref(db, 'learningData');
        const newDataRef = push(dataRef);
        await set(newDataRef, {
            title: title,
            questions: parsedQuestions
        });
        alert("학습 데이터가 성공적으로 업로드되었습니다.");
        document.getElementById('data-title-input').value = '';
        document.getElementById('excel-input').value = ''; // reset file input
        loadLearningDataForAdmin(); // refresh list
    } catch (e) {
        console.error(e);
        alert("업로드 실패: " + e.message);
    }
};

function loadLearningDataForAdmin() {
    const listContainer = document.getElementById('data-list-container');
    listContainer.innerHTML = '로딩 중...';
    
    onValue(ref(db, 'learningData'), (snapshot) => {
        listContainer.innerHTML = '';
        if (!snapshot.exists()) {
            listContainer.innerHTML = '<div style="color:white; text-align:center;">등록된 학습 데이터가 없습니다.</div>';
            return;
        }
        
        snapshot.forEach((childSnapshot) => {
            const dataId = childSnapshot.key;
            const data = childSnapshot.val();
            
            const div = document.createElement('div');
            div.style.cssText = "display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ccc; padding: 8px 0; color: #000; font-size: 14px;";
            
            const titleSpan = document.createElement('span');
            titleSpan.textContent = data.title + ` (${data.questions.length}문항)`;
            
            const delBtn = document.createElement('button');
            delBtn.textContent = '삭제';
            delBtn.className = 'dex-settings-action-btn dex-danger';
            delBtn.style.cssText = "padding: 2px 8px; width: auto; min-width: 40px; border-radius: 4px; border: none; font-size: 12px;";
            delBtn.onclick = async () => {
                if(confirm(`'${data.title}' 데이터를 삭제하시겠습니까?`)) {
                    await remove(ref(db, `learningData/${dataId}`));
                }
            };
            
            div.appendChild(titleSpan);
            div.appendChild(delBtn);
            listContainer.appendChild(div);
        });
    });
}


// --- Student Logic ---
window.currentStudentId = null;

document.getElementById('btn-student-login').addEventListener('click', async () => {
    const id = document.getElementById('student-id-input').value.trim();
    const pw = document.getElementById('student-pw-input').value.trim();
    
    if (!id || !pw) {
        alert("아이디와 비밀번호를 모두 입력해주세요.");
        return;
    }
    
    try {
        const userRef = ref(db, `users/${id}`);
        const snapshot = await get(userRef);
        
        if (!snapshot.exists()) {
            alert("존재하지 않는 아이디입니다.");
            return;
        }
        
        const userData = snapshot.val();
        if (userData.password !== pw) {
            alert("비밀번호가 틀렸습니다.");
            return;
        }
        
        // Login Success
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
        alert("로그인 실패: " + e.message);
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
            listContainer.innerHTML = '<div style="color:white; text-align:center;">등록된 학습 데이터가 없습니다. 선생님께 문의하세요.</div>';
            return;
        }
        
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            
            const div = document.createElement('div');
            div.style.cssText = "padding: 10px; margin-bottom: 8px; border-radius: 4px; cursor: pointer; text-align: center; border: 2px solid #ccc; font-size: 16px; color: #000; font-family: 'NeoDunggeunmo';";
            div.textContent = data.title + ` (${data.questions.length}문항)`;
            
            div.onmouseover = () => div.style.borderColor = "#000";
            div.onmouseout = () => div.style.borderColor = "#ccc";
            
            div.onclick = () => {
                if (window.applyLearningData) {
                    window.applyLearningData(data.questions, data.title);
                }
                hideModal(studentDataSelectModal);
                alert(`'${data.title}' 데이터를 선택했습니다!`);
                document.getElementById('btn-select-learning-data').textContent = "학습 데이터 변경";
            };
            
            listContainer.appendChild(div);
        });
    }).catch(e => {
        listContainer.innerHTML = '데이터 로딩 실패';
        console.error(e);
    });
});

// --- 학생 계정 관리 ---

document.getElementById('btn-admin-manage-students').addEventListener('click', async () => {
    switchScreen(adminStudentManageScreen);
    const listContainer = document.getElementById('student-list-container');
    listContainer.innerHTML = '로딩 중...';
    
    try {
        const usersRef = window.firebaseRef(db, 'users');
        const snapshot = await window.firebaseGet(usersRef);
        listContainer.innerHTML = '';
        
        if (!snapshot.exists()) {
            listContainer.innerHTML = '<div style="color:#000;">학생 계정이 없습니다.</div>';
            return;
        }
        
        const users = snapshot.val();
        let hasStudents = false;
        
        for (const [id, data] of Object.entries(users)) {
            hasStudents = true;
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.borderBottom = '1px solid #ccc';
            row.style.paddingBottom = '4px';
            
            const titleSpan = document.createElement('span');
            titleSpan.textContent = `${id}`;
            titleSpan.style.color = '#000';
            titleSpan.style.fontSize = '14px';
            
            const delBtn = document.createElement('button');
            delBtn.className = 'dex-settings-action-btn dex-danger';
            delBtn.textContent = '삭제';
            delBtn.style.padding = '0 8px';
            delBtn.style.height = '24px';
            delBtn.style.fontSize = '12px';
            
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
            listContainer.innerHTML = '<div style="color:#000;">학생 계정이 없습니다.</div>';
        }
        
    } catch (e) {
        console.error(e);
        listContainer.innerHTML = '<div style="color:#000;">오류 발생</div>';
    }
});

document.getElementById('btn-student-manage-back').addEventListener('click', () => {
    switchScreen(adminDashboard);
});
