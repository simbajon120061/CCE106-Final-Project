import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { colors, spacing, typography, radius } from "@/constants/theme";
import { createUser, getUserByPhone } from "@/db/database";
import { normalizePhoneNumber } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";

export default function SignupScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { login } = useAuth();

  const [storeName, setStoreName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    if (!storeName.trim() || !normalizedPhone || !pin || !confirmPin) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      Alert.alert("Invalid PIN", "Choose a 4-digit PIN code.");
      return;
    }

    if (pin !== confirmPin) {
      Alert.alert("PIN Mismatch", "PIN codes do not match.");
      return;
    }

    setLoading(true);
    try {
      const existingUser = await getUserByPhone(db, normalizedPhone);
      if (existingUser) {
        Alert.alert("Account Exists", "An account with this phone number already exists.");
        setLoading(false);
        return;
      }

      const userId = await createUser(db, {
        storeName: storeName.trim(),
        phoneNumber: normalizedPhone,
        pin,
      });

      await login({
        id: userId,
        phoneNumber: normalizedPhone,
        storeName: storeName.trim(),
      });
    } catch (_error) {
      Alert.alert("Error", "Could not create account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="chevron-back" size={24} color={colors.navy} />
            </Pressable>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Set up your sari-sari store ledger</Text>
          </View>

          <Card style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Store Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Aling Nena's Store"
                placeholderTextColor={colors.textMuted}
                value={storeName}
                onChangeText={setStoreName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="09XXXXXXXXX"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={(value) => setPhoneNumber(normalizePhoneNumber(value))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>4-Digit PIN</Text>
              <TextInput
                style={styles.input}
                placeholder="0000"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                keyboardType="number-pad"
                maxLength={4}
                value={pin}
                onChangeText={(value) => setPin(value.replace(/\D/g, ""))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm PIN</Text>
              <TextInput
                style={styles.input}
                placeholder="0000"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                keyboardType="number-pad"
                maxLength={4}
                value={confirmPin}
                onChangeText={(value) => setConfirmPin(value.replace(/\D/g, ""))}
              />
            </View>

            <Button
              title={loading ? "Registering..." : "Register Store"}
              onPress={handleSignup}
              disabled={loading}
              style={{ marginTop: spacing.sm }}
            />
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Pressable onPress={() => router.push("/login")}>
              <Text style={styles.linkText}>Sign In</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  container: { padding: spacing.md, justifyContent: "center", minHeight: "100%" },
  header: { alignItems: "center", marginBottom: spacing.lg, position: "relative" },
  backBtn: { position: "absolute", left: 0, top: 0 },
  title: { ...typography.title, textAlign: "center" },
  subtitle: { ...typography.label, textAlign: "center", marginTop: 4 },
  formCard: { gap: spacing.md },
  inputGroup: { gap: 6 },
  label: { ...typography.label, fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.white,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.lg,
  },
  footerText: { fontSize: 14, color: colors.textMuted },
  linkText: { fontSize: 14, fontWeight: "700", color: colors.navy },
});
