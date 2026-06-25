import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

export const myCustomFirebaseConfig = {
  apiKey: "AIzaSyAK5pxlxoaA37EGs3TRw1Q8F-9ghFw-o9w",
  authDomain: "portaldepermutas.firebaseapp.com",
  projectId: "portaldepermutas",
  storageBucket: "portaldepermutas.firebasestorage.app",
  messagingSenderId: "496739921207",
  appId: "1:496739921207:web:04ceef2d6a4d8679937eb2",
  measurementId: "G-JBKLB3DDG1"
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

export function getFirebase() {
  if (typeof window === 'undefined') {
    return { app: null, db: null, auth: null };
  }

  try {
    if (!app) {
      if (getApps().length > 0) {
        app = getApp();
      } else {
        app = initializeApp(myCustomFirebaseConfig);
      }
      db = getFirestore(app);
      auth = getAuth(app);
    }
  } catch (error) {
    console.warn("Erro ao inicializar Firebase (Modo Offline Ativado):", error);
  }

  return { app, db, auth };
}
