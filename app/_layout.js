import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { View, ActivityIndicator } from "react-native";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { migrateDbIfNeeded } from "@/db/database";
import { colors } from "@/constants/theme";

function InitialLayout() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup =
      segments[0] === "login" ||
      segments[0] === "signup";

    if (!user && !inAuthGroup) {
      router.replace("/login");
    } else if (user && inAuthGroup) {
      router.replace("/home/dashboard");
    }
  }, [user, isLoading, segments]);

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