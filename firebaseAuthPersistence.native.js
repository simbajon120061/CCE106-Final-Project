import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function initializeFirebaseAuth(app) {
  try {
    initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    if (error.code !== "auth/already-initialized") {
      throw error;
    }
  }
}
