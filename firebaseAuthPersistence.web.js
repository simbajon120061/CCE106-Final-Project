import { getAuth } from "firebase/auth";

export function initializeFirebaseAuth(app) {
  return getAuth(app);
}
