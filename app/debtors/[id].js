import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useCallback, useMemo } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import Card from "@/components/Card";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import BottomNav, { bottomNavHeight } from "@/components/BottomNav";
import { colors, spacing, typography, radius } from "@/constants/theme";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getDebtor, getTransactionsForDebtor, deleteTransaction, deleteDebtor } from "@/db/database";

export default function DebtorDetailScreen() {
  const { id } = useLocalSearchParams();
  const debtorId = Number(id);
  const db = useSQLiteContext();
  const router = useRouter();
  const [debtor, setDebtor] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const runningBalances = useMemo(() => {
    const balances = new Map();
    let running = 0;

    [...transactions]
      .sort((a, b) => {
        const dateDiff = new Date(a.created_at) - new Date(b.created_at);
        return dateDiff || a.id - b.id;
      })
      .forEach((tx) => {
        running += tx.type === "credit" ? tx.amount : -tx.amount;
        balances.set(tx.id, running);
      });

    return balances;
  }, [transactions]);

  const load = useCallback(async () => {
    const [d, tx] = await Promise.all([
      getDebtor(db, debtorId),
      getTransactionsForDebtor(db, debtorId),
    ]);
    setDebtor(d);
    setTransactions(tx);
  }, [db, debtorId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleDeleteTx(txId) {
    Alert.alert("Remove entry", "Delete this transaction? This will update the balance.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteTransaction(db, txId);
          load();
        },
      },
    ]);
  }

  async function handleDeleteDebtor() {
    if ((debtor?.balance ?? 0) > 0) {
      Alert.alert(
        "May utang pa",
        `${debtor.full_name} still has an outstanding balance of ${formatCurrency(debtor.balance)}. Settle it before removing this debtor.`
      );
      return;
    }

    Alert.alert("Remove debtor", `Remove ${debtor?.full_name} and all their records?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteDebtor(db, debtorId);
          router.back();
        },
      },
    ]);
  }

  if (!debtor) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.navy} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{debtor.full_name}</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={handleDeleteDebtor} hitSlop={12}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current balance</Text>
          <Text
            style={[
              styles.balanceValue,
              { color: debtor.balance > 0 ? colors.danger : colors.success },
            ]}
          >
            {formatCurrency(debtor.balance)}
          </Text>
          <View style={styles.actionsRow}>
            <View style={{ flex: 1 }}>
              <Button
                title="Log credit sale"
                variant="primary"
                onPress={() =>
                  router.push({ pathname: "/debtors/add-credit", params: { debtorId: String(debtorId) } })
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title="Record payment"
                variant="secondary"
                onPress={() =>
                  router.push({ pathname: "/debtors/add-payment", params: { debtorId: String(debtorId) } })
                }
              />
            </View>
          </View>
        </Card>

        {/* Profile Card with Edit Button */}
        <Card style={{ gap: spacing.xs }}>
          <View style={styles.profileHeader}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <Pressable
              onPress={() =>
                router.push({ pathname: "/debtors/edit", params: { debtorId: String(debtorId) } })
              }
              hitSlop={12}
            >
              <Ionicons name="create-outline" size={20} color={colors.navy} />
            </Pressable>
          </View>
          {debtor.id_photo_uri ? (
            <Image source={{ uri: debtor.id_photo_uri }} style={styles.idPhoto} />
          ) : null}
          <InfoRow icon="call-outline" value={debtor.contact_number || "No contact number"} />
          <InfoRow icon="location-outline" value={debtor.address || "No address on file"} />
          <InfoRow
            icon="wallet-outline"
            value={
              debtor.credit_limit > 0
                ? `Credit limit: ${formatCurrency(debtor.credit_limit)}`
                : "No credit limit"
            }
          />
          {debtor.notes ? <InfoRow icon="document-text-outline" value={debtor.notes} /> : null}
        </Card>

        <Text style={styles.sectionTitle}>Transaction history</Text>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {transactions.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title="No transactions yet"
              subtitle="Log a credit sale to get started."
            />
          ) : (
            transactions.map((tx, i) => (
              <Pressable
                key={tx.id}
                onLongPress={() => handleDeleteTx(tx.id)}
                style={[
                  styles.txRow,
                  i !== transactions.length - 1 && styles.txRowBorder,
                ]}
              >
                <View
                  style={[
                    styles.txIcon,
                    { backgroundColor: tx.type === "credit" ? "#B3413B1A" : "#2E7D5B1A" },
                  ]}
                >
                  <Ionicons
                    name={tx.type === "credit" ? "arrow-up-outline" : "arrow-down-outline"}
                    size={16}
                    color={tx.type === "credit" ? colors.danger : colors.success}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txName}>
                    {tx.type === "credit" ? "Credit purchase" : "Payment received"}
                  </Text>
                  <Text style={styles.txMeta}>
                    {tx.description ? `${tx.description} · ` : ""}
                    {formatDateTime(tx.created_at)}
                  </Text>
                </View>
                <View style={styles.txBalanceCol}>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: tx.type === "credit" ? colors.danger : colors.success },
                    ]}
                  >
                    {tx.type === "credit" ? "+" : "-"}
                    {formatCurrency(tx.amount)}
                  </Text>
                  <Text style={styles.runningBalance}>
                    Bal: {formatCurrency(runningBalances.get(tx.id) ?? 0)}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </Card>
        {transactions.length > 0 && (
          <Text style={styles.hint}>Tip: press and hold an entry to remove it.</Text>
        )}
      </ScrollView>
      <BottomNav activeTab="debtors" />
    </SafeAreaView>
  );
}

function InfoRow({ icon, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <Text style={styles.infoValue}>{value}</Text>
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
    gap: spacing.sm,
  },
  title: { ...typography.heading, flex: 1, textAlign: "center" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: bottomNavHeight + spacing.xl },
  balanceCard: { alignItems: "center", gap: spacing.sm, backgroundColor: colors.navy, borderWidth: 0 },
  balanceLabel: { color: colors.goldLight, fontSize: 13, fontWeight: "600" },
  balanceValue: { fontSize: 32, fontWeight: "800", color: colors.white },
  actionsRow: { flexDirection: "row", gap: spacing.sm, width: "100%", marginTop: spacing.sm },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  sectionTitle: { ...typography.heading, fontSize: 15 },
  idPhoto: {
    width: "100%",
    height: 180,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  infoValue: { fontSize: 14, color: colors.text, flex: 1 },
  txRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md },
  txRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  txIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  txName: { fontSize: 14, fontWeight: "700", color: colors.text },
  txMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  txBalanceCol: { alignItems: "flex-end", maxWidth: 112 },
  txAmount: { fontSize: 14, fontWeight: "800" },
  runningBalance: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  hint: { fontSize: 12, color: colors.textMuted, textAlign: "center" },
});