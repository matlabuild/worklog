import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Replace these values with your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCDzRmLbptFiwbb1Tb6ZHZ1erb_hhwxEiY",
    authDomain: "work-log-45fd1.firebaseapp.com",
    projectId: "work-log-45fd1",
    storageBucket: "work-log-45fd1.firebasestorage.app",
    messagingSenderId: "225506007287",
    appId: "1:225506007287:web:3d40e83e574209c6bc9bf2"
  };
// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); 