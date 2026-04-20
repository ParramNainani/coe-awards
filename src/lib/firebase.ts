import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBpV0G6XBvdTM4Wak2aL5euxtx-9YGuqU0",
  authDomain: "coe-awards.firebaseapp.com",
  projectId: "coe-awards",
  storageBucket: "coe-awards.firebasestorage.app",
  messagingSenderId: "991073596593",
  appId: "1:991073596593:web:43ed0cdd31b784dd4a9e90",
  measurementId: "G-LVQJBSF4MZ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
