import { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography, radius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import BottomNav, { bottomNavHeight } from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { formatCurrency } from "@/lib/format";
import {
  getDailySalesSummary,
  getLowStockProducts,
  getTotalOutstanding,
} from "@/db/database";

const quickActions = [
  {
    title: "New Sale",
    icon: "cart",
    route: "/sell",
  },
  {
    title: "Record Payment",
    icon: "cash",
    route: "/debtors",
  },
  {
    title: "Add Product",
    icon: "add-circle",
    route: "/inventory/new",
  },
  {
    title: "Add Debtor",
    icon: "person-add",
    route: "/debtors/new",
  },
];

export default function DashboardScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todaySales: 0,
    cashSales: 0,
    utangSales: 0,
    outstanding: 0,
    itemsSold: 0,
    lowStockCount: 0,
  });

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadDashboard() {
        const todayIso = new Date().toISOString().slice(0, 10);
        const [summaryRows, outstanding, lowStock, itemRow] = await Promise.all([
          getDailySalesSummary(db, 1),
          getTotalOutstanding(db),
          getLowStockProducts(db),
          db.getFirstAsync(
            `SELECT COALESCE(SUM(quantity), 0) AS total
             FROM transactions
             WHERE type = 'credit' AND date(created_at) = date('now')`
          ),
        ]);

        if (!active) return;

        const todaySummary = summaryRows.find((row) => row.date === todayIso);
        const utangSales = todaySummary?.credit_total ?? todaySummary?.total_credit_sales ?? 0;
        const cashSales = todaySummary?.cash_total ?? 0;

        setStats({
          todaySales: cashSales + utangSales,
          cashSales,
          utangSales,
          outstanding,
          itemsSold: todaySummary?.item_count ?? itemRow?.total ?? 0,
          lowStockCount: lowStock.length,
        });
      }

      loadDashboard();

      return () => {
        active = false;
      };
    }, [db])
  );

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-PH", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    []
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TopHeader title="Home" subtitle={user?.storeName || "My Store"} />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.dateText}>{todayLabel}</Text>

        <View style={styles.summaryRow}>
          <MetricCard label="Today's Sales" value={formatCurrency(stats.todaySales)} tone="good" />
          <MetricCard
            label="Outstanding Utang"
            value={formatCurrency(stats.outstanding)}
            tone="danger"
          />
        </View>

        {stats.lowStockCount > 0 && (
          <Pressable style={styles.alertBanner} onPress={() => router.push("/reports")}>
            <Ionicons name="warning" size={22} color={colors.danger} />
            <Text style={styles.alertText}>
              {stats.lowStockCount} product{stats.lowStockCount === 1 ? "" : "s"} low on
              stock - tap to review
            </Text>
          </Pressable>
        )}

        <SectionTitle title="Quick Actions" />
        <View style={styles.actionGrid}>
          {quickActions.map((item) => (
            <ActionCard key={item.title} item={item} onPress={() => router.push(item.route)} />
          ))}
        </View>

        <SectionTitle title="Today at a Glance" />
        <View style={styles.glanceRow}>
          <GlanceCard label="Cash Sales" value={formatCurrency(stats.cashSales)} />
          <GlanceCard label="Utang Sales" value={formatCurrency(stats.utangSales)} danger />
          <GlanceCard label="Items Sold" value={String(stats.itemsSold)} />
        </View>
      </ScrollView>

      <BottomNav activeTab="home" />
    </SafeAreaView>
  );
}

function SectionTitle({ title }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function MetricCard({ label, value, tone }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={[
          styles.metricValue,
          tone === "good" && styles.metricGood,
          tone === "danger" && styles.metricDanger,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function ActionCard({ item, onPress }) {
  return (
    <Pressable style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]} onPress={onPress}>
      <Ionicons name={item.icon} size={34} color={colors.navy} />
      <Text style={styles.actionTitle}>{item.title}</Text>
    </Pressable>
  );
}

function GlanceCard({ label, value, danger }) {
  return (
    <View style={styles.glanceCard}>
      <Text style={styles.glanceLabel}>{label}</Text>
      <Text style={[styles.glanceValue, danger && styles.metricDanger]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  container: {
    flexGrow: 1,
    padding: spacing.md,
    paddingBottom: bottomNavHeight + spacing.xl,
    gap: spacing.md,
  },
  dateText: {
    fontSize: 18,
    color: colors.textMuted,
    fontWeight: "500",
  },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    minHeight: 88,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm,
  },
  metricLabel: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "600",
    textAlign: "center",
  },
  metricValue: {
    marginTop: 6,
    fontSize: 22,
    color: colors.navy,
    fontWeight: "900",
  },
  metricGood: {
    color: colors.success,
  },
  metricDanger: {
    color: colors.danger,
  },
  alertBanner: {
    minHeight: 58,
    backgroundColor: "#FDECEA",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  alertText: {
    flex: 1,
    color: colors.danger,
    fontSize: 14,
    fontWeight: "800",
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
    fontSize: 18,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  actionCard: {
    width: "48.5%",
    minHeight: 112,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.78,
  },
  actionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  glanceRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  glanceCard: {
    flex: 1,
    minHeight: 86,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm,
  },
  glanceLabel: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "600",
    textAlign: "center",
  },
  glanceValue: {
    marginTop: spacing.sm,
    fontSize: 20,
    color: colors.text,
    fontWeight: "900",
    textAlign: "center",
  },
});
