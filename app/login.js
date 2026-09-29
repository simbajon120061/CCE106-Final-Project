import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { colors, spacing, typography, radius } from "@/constants/theme";
import { getUserByPhone } from "@/db/database";
import { normalizePhoneNumber } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";

export default function LoginScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { login } = useAuth();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [pinDigits, setPinDigits] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const pinInputRefs = useRef([]);
  const pin = pinDigits.join("");

  function handlePinChange(value, index) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setPinDigits((currentDigits) => {
      const nextDigits = [...currentDigits];
      nextDigits[index] = digit;
      return nextDigits;
    });

    if (digit && index < 3) {
      pinInputRefs.current[index + 1]?.focus();
    }
  }

  function handlePinKeyPress(event, index) {
    if (event.nativeEvent.key === "Backspace" && !pinDigits[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  }

  async function handleLogin() {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    if (!normalizedPhone || !pin) {
      Alert.alert("Missing Fields", "Please enter both phone number and PIN.");
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      Alert.alert("Invalid PIN", "Enter your 4-digit PIN code.");
      return;
    }

    setLoading(true);
    try {
      const user = await getUserByPhone(db, normalizedPhone);
      if (!user || user.pin_code !== pin) {
        Alert.alert("Authentication Failed", "Invalid phone number or PIN.");
        setLoading(false);
        return;
      }

      await login({
        id: user.id,
        phoneNumber: user.phone_number,
        storeName: user.store_name,
      });
    } catch (_error) {
      Alert.alert("Error", "An unexpected error occurred during login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Image source={require("../assets/icon.png")} style={styles.logo} />
            </View>
            <Text style={styles.subtitle}>Log in to manage your store ledger</Text>
          </View>

          <View style={styles.phoneWrap}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.phonePill}>
              <TextInput
                style={styles.phoneInput}
                placeholder="09XXXXXXXXX"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={(value) => setPhoneNumber(normalizePhoneNumber(value))}
              />
            </View>
          </View>

          <Card style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>4-Digit PIN</Text>
              <View style={styles.pinRow}>
                {[0, 1, 2, 3].map((index) => (
                  <TextInput
                    key={index}
                    ref={(input) => {
                      pinInputRefs.current[index] = input;
                    }}
                    style={styles.pinBox}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                    keyboardType="number-pad"
                    maxLength={1}
                    value={pinDigits[index]}
                    onChangeText={(value) => handlePinChange(value, index)}
                    onKeyPress={(event) => handlePinKeyPress(event, index)}
                    textAlign="center"
                  />
                ))}
              </View>
            </View>

            <Button
              title={loading ? "Signing in..." : "Sign In"}
              onPress={handleLogin}
              disabled={loading}
              style={{ marginTop: spacing.sm }}
            />
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{"Don't have an account?"}</Text>
            <Pressable onPress={() => router.push("/signup")}>
              <Text style={styles.linkText}>Create Account</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  container: { flex: 1, padding: spacing.md, paddingTop: spacing.xl, justifyContent: "flex-start" },
  header: { alignItems: "center", marginBottom: spacing.xl },
  logoBadge: {
    width: 104,
    height: 104,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  logo: { width: 104, height: 104, resizeMode: "contain" },
  subtitle: { ...typography.label, textAlign: "center", marginTop: 4 },
  phoneWrap: { gap: 6, marginBottom: spacing.md },
  phonePill: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  phoneInput: {
    fontSize: 16,
    color: colors.text,
    paddingVertical: 0,
  },
  formCard: { gap: spacing.md },
  inputGroup: { gap: 6 },
  label: { ...typography.label, fontSize: 12 },
  pinRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  pinBox: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    fontSize: 22,
    fontWeight: "700",
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