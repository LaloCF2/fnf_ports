import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, get, set, update, remove, push, onValue, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCG2_mOYbHLkCB5xcaker4mR7KJZVt0zRM",
  authDomain: "fnf-mobile-lalocf.firebaseapp.com",
  databaseURL: "https://fnf-mobile-lalocf-default-rtdb.firebaseio.com",
  projectId: "fnf-mobile-lalocf",
  storageBucket: "fnf-mobile-lalocf.firebasestorage.app",
  messagingSenderId: "407243542354",
  appId: "1:407243542354:web:0da0f6a80db245f6bb348b"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const APP_VERSION = "v7.0.0";
export const MI_UID_ADMIN = "Mtsvw6hM8FYu19Sk3yPnbDLtfOf2";

window.db = db;
window.auth = auth;
window.app = app;
window.APP_VERSION = APP_VERSION;
window.MI_UID_ADMIN = MI_UID_ADMIN;
