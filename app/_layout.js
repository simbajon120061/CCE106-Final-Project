import { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import { View, ActivityIndicator } from "react-native";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { migrateDbIfNeeded } from "@/db/database";
import { colors } from "@/constants/theme";
import { loadDebtorDraft } from "@/lib/debtorDraft";

function InitialLayout() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const db = useSQLiteContext();
  const [hasRegisteredUser, setHasRegisteredUser] = useState(null);

  useEffect(() => {
    let isActive = true;

    async function checkForRegisteredUser() {
      try {
        const result = await db.getFirstAsync(
          "SELECT COUNT(*) AS count FROM users"
        );
        if (isActive) {
          setHasRegisteredUser(Number(result?.count) > 0);
        }
      } catch (error) {
        console.error("Failed to check registered users", error);
        if (isActive) {
          setHasRegisteredUser(true);
        }
      }
    }

    checkForRegisteredUser();

    return () => {
      isActive = false;
    };
  }, [db]);

  useEffect(() => {
    if (isLoading || hasRegisteredUser === null) return;

    const inAuthGroup =
      segments[0] === "login" ||
      segments[0] === "signup";
    const isWelcomeScreen =
      segments.length === 0 || segments[0] === "index";

  if (user && (inAuthGroup || isWelcomeScreen)) {
    router.replace("/home/dashboard");
    } else if (!user && !inAuthGroup && !isWelcomeScreen) {
      router.replace(hasRegisteredUser ? "/login" : "/signup");
    }
  }, [user, isLoading, hasRegisteredUser, segments, router]);

  if (isLoading || hasRegisteredUser === null) {
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

export default function RootLayout() {
  return (
    <SQLiteProvider
      databaseName="store.db"
      onInit={migrateDbIfNeeded}
    >
      <AuthProvider>
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
