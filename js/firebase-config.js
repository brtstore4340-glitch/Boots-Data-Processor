import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCIAnpjvT2k6K-54tGx8MLSzXLXtVQCGDk",
  authDomain: "daily-report-c7e73.firebaseapp.com",
  projectId: "daily-report-c7e73",
  storageBucket: "daily-report-c7e73.firebasestorage.app",
  messagingSenderId: "784313419402",
  appId: "1:784313419402:web:4e31ceccb3caaf4c830f73"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };