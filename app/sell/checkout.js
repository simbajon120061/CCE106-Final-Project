import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import Button from "@/components/Button";
import Card from "@/components/Card";
import BottomNav, { bottomNavHeight } from "@/components/BottomNav";
import { colors, spacing, typography, radius } from "@/constants/theme";
import { formatCurrency } from "@/lib/format";
import { createSale, getDebtorOptions } from "@/db/database";

export default function CheckoutScreen() {
  const { cart } = useLocalSearchParams();
  const db = useSQLiteContext();
  const router = useRouter();
  const [saleType, setSaleType] = useState("cash");
  const [debtors, setDebtors] = useState([]);
  const [selectedDebtorId, setSelectedDebtorId] = useState(null);
  const [saving, setSaving] = useState(false);

  const cartItems = useMemo(() => {
    try {
      return JSON.parse(Array.isArray(cart) ? cart[0] : cart || "[]");
    } catch {
      return [];
    }
  }, [cart]);

  useEffect(() => {
    getDebtorOptions(db).then(setDebtors);
  }, [db]);

  const total = cartItems.reduce(
    (sum, item) => sum + item.quantity * item.product.unit_price,
    0
  );

  async function handleConfirm() {
    if (saleType === "credit" && !selectedDebtorId) {
      Alert.alert("Select debtor", "Choose which customer this utang belongs to.");
      return;
    }

    setSaving(true);
    try {
      await createSale(db, {
        saleType,
        debtorId: selectedDebtorId,
        items: cartItems,
      });
      Alert.alert("Sale recorded", `Total: ${formatCurrency(total)}`, [
        { text: "OK", onPress: () => router.replace("/sell") },
      ]);
    } catch (error) {
      Alert.alert("Could not complete sale", error.message || "Please check stock and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.navy} />
        </Pressable>
        <Text style={styles.title}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {cartItems.map((item, index) => (
            <View
              key={item.product.id}
              style={[styles.itemRow, index !== cartItems.length - 1 && styles.rowBorder]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.product.name}</Text>
                <Text style={styles.itemMeta}>
                  {item.quantity} x {formatCurrency(item.product.unit_price)}
                </Text>
              </View>
              <Text style={styles.itemTotal}>
                {formatCurrency(item.quantity * item.product.unit_price)}
              </Text>
            </View>
          ))}
        </Card>

        <Card style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
        </Card>

        <Text style={styles.sectionTitle}>Payment type</Text>
        <View style={styles.typeRow}>
          <OptionChip label="Cash" active={saleType === "cash"} onPress={() => setSaleType("cash")} />
          <OptionChip label="Utang" active={saleType === "credit"} onPress={() => setSaleType("credit")} />
        </View>

        {saleType === "credit" && (
          <>
            <View style={styles.debtorHeader}>
              <Text style={styles.sectionTitle}>Select debtor</Text>
              <Pressable onPress={() => router.push("/debtors/new")}>
                <Text style={styles.addDebtorText}>Add debtor</Text>
              </Pressable>
            </View>
            {debtors.length === 0 ? (
              <Text style={styles.emptyText}>No debtors yet. Add one first.</Text>
            ) : (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                {debtors.map((debtor, index) => {
                  const active = selectedDebtorId === debtor.id;
                  return (
                    <Pressable
                      key={debtor.id}
                      style={[
                        styles.debtorRow,
                        index !== debtors.length - 1 && styles.rowBorder,
                        active && styles.debtorRowActive,
                      ]}
                      onPress={() => setSelectedDebtorId(debtor.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.debtorName, active && styles.debtorNameActive]}>
                          {debtor.full_name}
                        </Text>
                        <Text style={[styles.debtorMeta, active && styles.debtorMetaActive]}>
                          Balance: {formatCurrency(debtor.balance || 0)}
                        </Text>
                      </View>
                      {active && <Ionicons name="checkmark-circle" size={21} color={colors.white} />}
                    </Pressable>
                  );
                })}
              </Card>
            )}
          </>
        )}

        <Button
          title={saving ? "Saving..." : "Confirm sale"}
          onPress={handleConfirm}
          loading={saving}
        />
      </ScrollView>
      <BottomNav activeTab="sell" />
    </SafeAreaView>
  );
}

function OptionChip({ label, active, onPress }) {
  return (
    <Pressable style={[styles.typeChip, active && styles.typeChipActive]} onPress={onPress}>
      <Text style={[styles.typeText, active && styles.typeTextActive]}>{label}</Text>
    </Pressable>
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
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: bottomNavHeight + spacing.xl },
  itemRow: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  itemName: { fontSize: 14, fontWeight: "800", color: colors.text },
  itemMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: "900", color: colors.text },
  totalCard: { alignItems: "center", backgroundColor: colors.navy, borderWidth: 0, gap: 4 },
  totalLabel: { color: colors.goldLight, fontSize: 12, fontWeight: "700" },
  totalValue: { color: colors.white, fontSize: 28, fontWeight: "900" },
  sectionTitle: { ...typography.heading, fontSize: 15 },
  typeRow: { flexDirection: "row", gap: spacing.sm },
  typeChip: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  typeChipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  typeText: { fontSize: 13, color: colors.textMuted, fontWeight: "800" },
  typeTextActive: { color: colors.white },
  debtorHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  addDebtorText: { color: colors.navy, fontSize: 13, fontWeight: "800" },
  debtorRow: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: spacing.sm },
  debtorRowActive: { backgroundColor: colors.navy },
  debtorName: { fontSize: 14, fontWeight: "800", color: colors.text },
  debtorNameActive: { color: colors.white },
  debtorMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  debtorMetaActive: { color: colors.goldLight },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: "center" },
});
