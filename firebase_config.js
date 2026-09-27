import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getDatabase, ref, set, get, update, push, remove, child, onValue, onChildAdded, onDisconnect, runTransaction } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

// TODO: Firebase Console에서 앱 등록 후 아래 값을 자신의 프로젝트 설정으로 교체하세요.
const firebaseConfig = {
  apiKey: "AIzaSyDqR0eWQ1CYnPlJVDKLV7Qho4BwvuVx-VE",
  authDomain: "pokemon-masters-af173.firebaseapp.com",
  projectId: "pokemon-masters-af173",
  storageBucket: "pokemon-masters-af173.firebasestorage.app",
  messagingSenderId: "18548511403",
  appId: "1:18548511403:web:661cda5cc566260c9c1dee",
  measurementId: "G-J28P6D8554"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// 전역 객체 노출 (모듈 외부에서 접근용)
window.firebaseDb = db; 
window.firebaseRef = ref;
window.firebaseSet = set;
window.firebaseGet = get;
window.firebaseUpdate = update;
window.firebasePush = push;
window.firebaseRemove = remove;
window.firebaseChild = child;
window.firebaseOnValue = onValue;
window.firebaseOnChildAdded = onChildAdded;
window.firebaseOnDisconnect = onDisconnect;
window.firebaseRunTransaction = runTransaction;
