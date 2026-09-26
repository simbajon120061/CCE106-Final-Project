import { View, Text, StyleSheet, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { colors, spacing, typography, radius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { updateUserProfile, updateUserPin, getUserByPhone } from "@/db/database";
import { normalizePhoneNumber } from "@/lib/auth";

export default function ProfileScreen() {
  const db = useSQLiteContext();
  const { user, login } = useAuth();

  const [storeName, setStoreName] = useState(user?.storeName || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [savingPin, setSavingPin] = useState(false);

  async function handleUpdateProfile() {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    if (!storeName.trim() || !normalizedPhone) {
      Alert.alert("Missing Fields", "Store name and phone number cannot be empty.");
      return;
    }

    setSavingProfile(true);
    try {
      await updateUserProfile(db, {
        id: user.id,
        storeName: storeName.trim(),
        phoneNumber: normalizedPhone,
      });

      await login({
        ...user,
        storeName: storeName.trim(),
        phoneNumber: normalizedPhone,
      });

      Alert.alert("Success", "Profile updated successfully!");
    } catch (_error) {
      Alert.alert("Error", "Could not update profile. Phone number may already be in use.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePin() {
    if (!currentPin || !newPin || !confirmPin) {
      Alert.alert("Missing Fields", "Please fill in all PIN fields.");
      return;
    }

    if (!/^\d{4}$/.test(currentPin) || !/^\d{4}$/.test(newPin)) {
      Alert.alert("Invalid PIN", "PIN codes must be exactly 4 digits.");
      return;
    }

    if (newPin !== confirmPin) {
      Alert.alert("PIN Mismatch", "New PIN codes do not match.");
      return;
    }

    setSavingPin(true);
    try {
      const dbUser = await getUserByPhone(db, user.phoneNumber);
      if (!dbUser || dbUser.pin_code !== currentPin) {
        Alert.alert("Authentication Failed", "Incorrect current PIN.");
        setSavingPin(false);
        return;
      }

      await updateUserPin(db, { id: user.id, newPin });
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");

      Alert.alert("Success", "PIN changed successfully!");
    } catch (_error) {
      Alert.alert("Error", "Could not update PIN. Please try again.");
    } finally {
      setSavingPin(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.avatarHeader}>
            <View style={styles.avatarCircle}>
              <Ionicons name="storefront" size={40} color={colors.gold} />
            </View>
            <Text style={styles.headerTitle}>{user?.storeName || "My Store"}</Text>
            <Text style={styles.headerSubtitle}>{user?.phoneNumber}</Text>
          </View>

          <Text style={styles.sectionTitle}>Store Details</Text>
          <Card style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Store Name</Text>
              <TextInput
                style={styles.input}
                value={storeName}
                onChangeText={setStoreName}
                placeholder="e.g. Aling Nena's Store"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={(value) => setPhoneNumber(normalizePhoneNumber(value))}
                keyboardType="phone-pad"
                placeholder="09XXXXXXXXX"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <Button
              title={savingProfile ? "Saving..." : "Save Profile Details"}
              onPress={handleUpdateProfile}
              disabled={savingProfile}
            />
          </Card>

          <Text style={styles.sectionTitle}>Security</Text>
          <Card style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current PIN</Text>
              <PinInput value={currentPin} onChangeText={setCurrentPin} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New PIN</Text>
              <PinInput value={newPin} onChangeText={setNewPin} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm New PIN</Text>
              <PinInput value={confirmPin} onChangeText={setConfirmPin} />
            </View>

            <Button
              title={savingPin ? "Updating..." : "Update PIN"}
              onPress={handleChangePin}
              disabled={savingPin}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PinInput({ value, onChangeText }) {
  return (
    <TextInput
      style={styles.input}
      secureTextEntry
      value={value}
      onChangeText={(nextValue) => onChangeText(nextValue.replace(/\D/g, ""))}
      keyboardType="number-pad"
      maxLength={4}
      placeholder="0000"
      placeholderTextColor={colors.textMuted}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  container: { padding: spacing.md, gap: spacing.md },
  avatarHeader: { alignItems: "center", marginVertical: spacing.sm },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  headerTitle: { ...typography.title, fontSize: 20 },
  headerSubtitle: { fontSize: 13, color: colors.textMuted },
  sectionTitle: { ...typography.title, fontSize: 16, marginTop: spacing.xs },
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
});
