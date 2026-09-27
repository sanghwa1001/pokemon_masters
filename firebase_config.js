import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getDatabase, ref, set, get, update, push, remove, child, onValue, onChildAdded, onDisconnect, runTransaction, serverTimestamp, query, orderByChild, endAt, limitToFirst } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

// DB 보안 규칙은 database.rules.json 참고 (Firebase 콘솔 > Realtime Database > 규칙 탭에 붙여넣어야 적용됨)

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
window.firebaseServerTimestamp = serverTimestamp;
window.firebaseQuery = query;
window.firebaseOrderByChild = orderByChild;
window.firebaseEndAt = endAt;
window.firebaseLimitToFirst = limitToFirst;

// 모듈 스크립트는 일반 스크립트(pokemon_multiplayer.js 등)보다 늦게 실행되므로, 준비된 시점을
// 이벤트로 알려서 연결 상태 감시(.info/connected) 같은 초기화를 그때 시작할 수 있게 함
window.dispatchEvent(new Event('firebase-ready'));
