// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // 1️⃣ استيراد خدمة قاعدة البيانات

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBBxDdnKE9a7vgYUFDAWgns8Dk5iOTMP2U",
  authDomain: "fayed-app-76c41.firebaseapp.com",
  projectId: "fayed-app-76c41",
  storageBucket: "fayed-app-76c41.firebasestorage.app",
  messagingSenderId: "861281920178",
  appId: "1:861281920178:web:684bd06e9f8ed72a6c55ab",
  measurementId: "G-EBKZW11WV7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// 2️⃣ تفعيل وتصدير قاعدة البيانات (Firestore) لكي يتمكن تطبيقك من استخدامها
export const db = getFirestore(app);