import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeFirebaseAuth } from "./firebaseAuthPersistence";

const firebaseConfig = {
  apiKey: "AIzaSyBUx2cxCCVfHuPMBlIIDTnKA6CRGKDg5h8",
  authDomain: "tracktally-f7dd3.firebaseapp.com",
  projectId: "tracktally-f7dd3",
  storageBucket: "tracktally-f7dd3.firebasestorage.app",
  messagingSenderId: "329456343078",
  appId: "1:329456343078:android:e4ddd7f360f1ae45c2eee7",
};

let app;
let auth;
let firebaseDb;

function initializeFirebase() {
  if (app) return;

  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = initializeFirebaseAuth(app);
  firebaseDb = getFirestore(app);
}

// Initialize on module load
initializeFirebase();

export function getFirebaseApp() {
  if (!app) initializeFirebase();
  return app;
}

export function getFirebaseAuth() {
  if (!auth) initializeFirebase();
  return auth;
}

export function getFirebaseDb() {
  if (!firebaseDb) initializeFirebase();
  return firebaseDb;
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

export { firebaseConfig };
