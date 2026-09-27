import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getDatabase, ref, set, get, update, push, remove, child, onValue, onChildAdded, onDisconnect } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

// TODO: Firebase Console에서 앱 등록 후 아래 값을 자신의 프로젝트 설정으로 교체하세요.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
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
