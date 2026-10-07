import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Expo exposes only variables prefixed with EXPO_PUBLIC_ to app code.
// Copy .env.example to .env and replace every value with the Firebase web
// app configuration from Firebase Console > Project settings > Your apps.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const requiredKeys = ["apiKey", "projectId", "appId"];

export const isFirebaseConfigured = requiredKeys.every(
  (key) => Boolean(firebaseConfig[key])
);

let firebaseApp;

export function getFirebaseApp() {
  if (!isFirebaseConfigured) {
    throw new Error(
      "Firebase is not configured. Copy .env.example to .env and add your Firebase web app configuration."
    );
  }

  if (!firebaseApp) {
    firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }

  return firebaseApp;
}

// Use these shared instances wherever Firebase Auth or Cloud Firestore is
// introduced. They are intentionally lazy so the existing SQLite-only app can
// still run until a Firebase project has been configured.
export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function getFirebaseDb() {
  return getFirestore(getFirebaseApp());
}

export { firebaseConfig };
