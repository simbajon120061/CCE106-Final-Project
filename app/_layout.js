import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import { View, ActivityIndicator } from "react-native";
import { onAuthStateChanged } from "firebase/auth";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { migrateDbIfNeeded } from "@/db/database";
import { colors } from "@/constants/theme";
import { getFirebaseAuth } from "@/firebaseConfig";
import {
  scheduleCloudSync,
  watchCloudSyncOnForeground,
} from "@/db/cloudSync";

function InitialLayout() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup =
      segments[0] === "login" ||
      segments[0] === "signup";
    const isWelcomeScreen =
      segments.length === 0 || segments[0] === "index";

  if (user && (inAuthGroup || isWelcomeScreen)) {
    router.replace("/home/dashboard");
    } else if (!user && !inAuthGroup && !isWelcomeScreen) {
    router.replace("/login");
    }
  }, [user, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={colors.navy}
        />
      </View>
    );
  }

  return <Slot />;
}

function CloudSyncBridge() {
  const db = useSQLiteContext();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return undefined;

    const schedule = () => scheduleCloudSync(db, user.id);
    schedule();
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), schedule);
    const stopWatchingForeground = watchCloudSyncOnForeground(db, user.id);

    return () => {
      unsubscribe();
      stopWatchingForeground();
    };
  }, [db, user?.id]);

  return null;
}

export default function RootLayout() {
  return (
    <SQLiteProvider
      databaseName="store.db"
      onInit={migrateDbIfNeeded}
    >
      <AuthProvider>
        <CloudSyncBridge />
        <InitialLayout />
      </AuthProvider>
    </SQLiteProvider>
  );
}

const styles = {
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.cream,
  },
};
