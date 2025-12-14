// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"; // Added for authentication
import { getFirestore } from "firebase/firestore"; // Added for Firestore

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAKYWWip-p9gmRegKhDk3xwGOjkSzuyDGY",
  authDomain: "pynor-e703d.firebaseapp.com",
  projectId: "pynor-e703d",
  storageBucket: "pynor-e703d.firebasestorage.app",
  messagingSenderId: "301501412553",
  appId: "1:301501412553:web:64e73e121e0861eb70c918",
  measurementId: "G-HVMMF40JRT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase services used by the app
export const auth = getAuth(app); // Export auth
export const db = getFirestore(app); // Export db