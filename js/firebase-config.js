import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCIAnpjvT2k6K-54tGx8MLSzXLXtVQCGDk",
  authDomain: "daily-report-c7e73.firebaseapp.com",
  projectId: "daily-report-c7e73",
  storageBucket: "daily-report-c7e73.firebasestorage.app",
  messagingSenderId: "784313419402",
  appId: "1:784313419402:web:4e31ceccb3caaf4c830f73",
  measurementId: "G-H94MZW6HY3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { app, auth, db };