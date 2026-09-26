import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Card from "@/components/Card";
import { colors, spacing, typography, radius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav"; // <-- 1. Import added here

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  function confirmLogout() {
    Alert.alert("Log Out", "Are you sure you want to log out of your store account?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: logout },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Top Header */}
      <TopHeader
        title="Settings"
        subtitle="Account Preferences"
        showSettings={false}
      />

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.container}>
        {/* User Quick Info */}
        <Card style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Ionicons name="storefront" size={24} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.storeName}>{user?.storeName || "My Store"}</Text>
              <Text style={styles.userPhone}>{user?.phoneNumber}</Text>
            </View>
            
          </View>
        </Card>

        {/* Account Section */}
        <Text style={styles.sectionHeader}>Account & Store</Text>
        <Card style={styles.menuCard}>
          <Pressable style={styles.menuItem} onPress={() => router.push("/profile")}>
            <Ionicons name="person-outline" size={20} color={colors.navy} />
            <Text style={styles.menuLabel}>Store Profile & Security</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </Card>

        {/* System & Support */}
        <Text style={styles.sectionHeader}>App Information</Text>
        <Card style={styles.menuCard}>
          <View style={styles.menuItem}>
            <Ionicons name="information-circle-outline" size={20} color={colors.navy} />
            <Text style={styles.menuLabel}>App Version</Text>
            <Text style={styles.menuValue}>1.0.0</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.menuItem}>
            <Ionicons name="server-outline" size={20} color={colors.navy} />
            <Text style={styles.menuLabel}>Database Engine</Text>
            <Text style={styles.menuValue}>Expo SQLite</Text>
          </View>
        </Card>

        {/* Logout Button */}
        <Pressable style={styles.logoutBtn} onPress={confirmLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Log Out of Account</Text>
        </Pressable>
      </ScrollView>

      {/* 2. Rendered Bottom Navbar here */}
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  container: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.cream, flexGrow: 1 },
  profileCard: { padding: spacing.md },
  profileRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  storeName: { fontSize: 16, fontWeight: "700", color: colors.text },
  userPhone: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  editLink: { fontSize: 13, fontWeight: "700", color: colors.navy },

  sectionHeader: { ...typography.title, fontSize: 14, marginTop: spacing.xs },
  menuCard: { paddingVertical: 4, paddingHorizontal: spacing.md },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: spacing.sm,
  },
  menuLabel: { flex: 1, fontSize: 14, color: colors.text, fontWeight: "500" },
  menuValue: { fontSize: 13, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.white,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#fecaca",
    marginTop: spacing.md,
  },
  logoutText: { fontSize: 14, fontWeight: "700", color: colors.danger },
});