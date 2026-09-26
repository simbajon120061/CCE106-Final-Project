import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import Button from "@/components/Button";
import BottomNav, { bottomNavHeight } from "@/components/BottomNav";
import { colors, spacing, typography, radius } from "@/constants/theme";
import { formatCurrency } from "@/lib/format";
import { addPaymentTransaction, getDebtor } from "@/db/database";

export default function AddPaymentScreen() {
  const { debtorId } = useLocalSearchParams();
  const db = useSQLiteContext();
  const router = useRouter();
  const [debtor, setDebtor] = useState(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDebtor(db, Number(debtorId)).then(setDebtor);
  }, [db, debtorId]);

  async function handleSave() {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      Alert.alert("Invalid amount", "Enter an amount greater than zero.");
      return;
    }
    setSaving(true);
    try {
      await addPaymentTransaction(db, {
        debtorId: Number(debtorId),
        amount: amt,
        description: description.trim() || null,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  const balance = debtor?.balance ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.navy} />
        </Pressable>
        <Text style={styles.title}>Record payment</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <View style={styles.balanceBanner}>
          <Text style={styles.balanceLabel}>Current balance</Text>
          <Text style={styles.balanceValue}>{formatCurrency(balance)}</Text>
        </View>

        <Field label="Amount paid (₱) *">
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </Field>

        {balance > 0 && (
          <View style={styles.quickRow}>
            <Pressable style={styles.quickChip} onPress={() => setAmount(balance.toFixed(2))}>
              <Text style={styles.quickChipText}>Pay full balance</Text>
            </Pressable>
            <Pressable style={styles.quickChip} onPress={() => setAmount((balance / 2).toFixed(2))}>
              <Text style={styles.quickChipText}>Pay half</Text>
            </Pressable>
          </View>
        )}

        <Field label="Note">
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Optional note"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </Field>

        <Button title="Save payment" onPress={handleSave} loading={saving} />
      </ScrollView>
      <BottomNav activeTab="debtors" />
    </SafeAreaView>
  );
}

function Field({ label, children }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: { ...typography.heading },
  form: { padding: spacing.md, gap: spacing.md, paddingBottom: bottomNavHeight + spacing.xl },
  label: { ...typography.label },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  balanceBanner: {
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    gap: 4,
  },
  balanceLabel: { color: colors.goldLight, fontSize: 12, fontWeight: "600" },
  balanceValue: { color: colors.white, fontSize: 24, fontWeight: "800" },
  quickRow: { flexDirection: "row", gap: spacing.sm },
  quickChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.full,
    paddingVertical: 8,
    alignItems: "center",
  },
  quickChipText: { color: colors.navyDark, fontSize: 12, fontWeight: "700" },
});
