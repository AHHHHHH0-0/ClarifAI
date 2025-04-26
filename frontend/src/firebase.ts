import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDERFSdOLgKg9JrywKfiuLZsW-9PTdsm0g",
  authDomain: "clarifai-5f201.firebaseapp.com",
  projectId: "clarifai-5f201",
  storageBucket: "clarifai-5f201.firebasestorage.app",
  messagingSenderId: "824173511993",
  appId: "1:824173511993:web:cfc5cbf7f0b17cf9a754e8",
  measurementId: "G-N0T2ENK0LQ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider(); 