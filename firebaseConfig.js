// The Firebase JavaScript SDK works inside Expo Go.  The React Native Firebase
// SDK requires a custom native build, so it cannot be used for Expo Go demos.
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import { initializeFirebaseAuth } from "./firebaseAuthPersistence";

const firebaseConfig = {
  apiKey: "AIzaSyBUx2cxCCVfHuPMBlIIDTnKA6CRGKDg5h8",
  authDomain: "tracktally-f7dd3.firebaseapp.com",
  projectId: "tracktally-f7dd3",
  storageBucket: "tracktally-f7dd3.firebasestorage.app",
  messagingSenderId: "329456343078",
  // This is the Android app ID from google-services.json. Firebase accepts it
  // as the app identifier for the JavaScript client as well.
  appId: "1:329456343078:android:e4ddd7f360f1ae45c2eee7",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

initializeFirebaseAuth(firebase.app());

export function getFirebaseApp() {
  return firebase.app();
}

export function getFirebaseAuth() {
  return firebase.auth();
}

export function getFirebaseDb() {
  return firebase.firestore();
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

export { firebaseConfig };
