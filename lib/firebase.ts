import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAK5pxlxoaA37EGs3TRw1Q8F-9ghFw-o9w",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "portaldepermutas.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "portaldepermutas",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "portaldepermutas.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "496739921207",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:496739921207:web:04ceef2d6a4d8679937eb2",
};

let app: any = null;
let db: any = null;
let auth: any = null;

export function getFirebase() {
  if (typeof window === 'undefined') {
    return { app: null, db: null, auth: null };
  }
  
  if (!firebaseConfig.apiKey) {
    return { app: null, db: null, auth: null };
  }

  if (!app) {
    try {
      app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      db = getFirestore(app);
      auth = getAuth(app);
    } catch (e) {
      console.error("Erro ao inicializar Firebase:", e);
    }
  }

  return { app, db, auth };
}
