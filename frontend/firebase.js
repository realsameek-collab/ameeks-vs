
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "ameek-vs.firebaseapp.com",
  projectId: "ameek-vs",
  storageBucket: "ameek-vs.firebasestorage.app",
  messagingSenderId: "722942126323",
  appId: "1:722942126323:web:8517333968de38890fef86"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
