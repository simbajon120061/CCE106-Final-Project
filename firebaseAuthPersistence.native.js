import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

let nativeAuth;

export function initializeFirebaseAuth(app) {
  if (!app) {
    return undefined;
  }

  try {
    nativeAuth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
    return nativeAuth;
  } catch (error) {
    if (error?.code === "auth/already-initialized") {
      nativeAuth = getAuth(app);
      return nativeAuth;
    }

    throw error;
  }
}
