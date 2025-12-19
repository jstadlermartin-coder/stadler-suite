import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebase Konfiguration - Werte direkt eingebettet für Static Export
const firebaseConfig = {
  apiKey: "AIzaSyBGr-2g5GTH0jqlEmd8niADdXRXszqGbpY",
  authDomain: "stadler-suite.firebaseapp.com",
  projectId: "stadler-suite",
  storageBucket: "stadler-suite.firebasestorage.app",
  messagingSenderId: "818386536862",
  appId: "1:818386536862:web:387cf2e81915bd25f0ee8f"
};

// Firebase App initialisieren (nur einmal)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Firestore Datenbank
export const db = getFirestore(app);

// Authentication
export const auth = getAuth(app);

// Storage für Bilder und 3D-Touren
export const storage = getStorage(app);

export default app;
