import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Share, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useCallback } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import Card from "@/components/Card";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import BottomNav, { bottomNavHeight } from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { colors, spacing, typography, radius } from "@/constants/theme";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  exportAllData,
  getDailySalesSummary,
  getLowStockProducts,
  getTransactionHistory,
  getUnpaidBalances,
} from "@/db/database";

export default function ReportsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [tab, setTab] = useState("sales");
  const [summary, setSummary] = useState([]);
  const [unpaid, setUnpaid] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [history, setHistory] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        const [s, u, l, h] = await Promise.all([
          getDailySalesSummary(db, 14),
          getUnpaidBalances(db),
          getLowStockProducts(db),
          getTransactionHistory(db, 30),
        ]);
        if (!active) return;
        setSummary(s);
        setUnpaid(u);
        setLowStock(l);
        setHistory(h);
      }
      load();
      return () => {
        active = false;
      };
    }, [db])
  );

  const totalUnpaid = unpaid.reduce((sum, d) => sum + d.balance, 0);
  const today = summary[0];
  const todayCash = today?.cash_total || 0;
  const todayCredit = today?.credit_total ?? today?.total_credit_sales ?? 0;
  const todayGrandTotal = todayCash + todayCredit;
  const todayItemsSold = today?.item_count || 0;

  async function handleShareBackup() {
    setBackupLoading(true);
    try {
      const data = await exportAllData(db);
      await Share.share({
        title: "Track and Tally Backup",
        message: JSON.stringify(data, null, 2),
      });
    } catch (error) {
      console.error("Failed to export backup:", error);
      Alert.alert("Export failed", "Please try again.");
    } finally {
      setBackupLoading(false);
    }
  }

  function buildReportsText() {
    const generatedDate = new Date().toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const lines = [
      "Track and Tally Reports",
      `Generated: ${generatedDate}`,
      "",
      "Today's Summary",
      `Cash sales: ${formatCurrency(todayCash)}`,
      `Utang sales: ${formatCurrency(todayCredit)}`,
      `Grand total: ${formatCurrency(todayGrandTotal)}`,
      `Items sold: ${todayItemsSold}`,
      "",
      `Unpaid Balances (${unpaid.length} debtors)`,
      `Total outstanding: ${formatCurrency(totalUnpaid)}`,
      ...unpaid.map((debtor) => `${debtor.full_name}: ${formatCurrency(debtor.balance)}`),
      "",
      "Inventory Watch",
      ...(lowStock.length
        ? lowStock.map((product) => `${product.name}: ${product.stock_quantity} left`)
        : ["Stock levels look healthy"]),
      "",
      "Recent History",
      ...(history.length
        ? history.map(
            (entry) =>
              `${formatDate(entry.date)} - ${entry.label}${entry.debtor_name ? ` - ${entry.debtor_name}` : ""}: ${formatCurrency(entry.amount)}`
          )
        : ["No activity recorded yet"]),
    ];

    return lines.join("\n");
  }

  function printReports(saveAsPdf = false) {
    if (Platform.OS !== "web" || !globalThis.window?.open) {
      Alert.alert(
        saveAsPdf ? "Save as PDF" : "Print reports",
        "Native print and PDF export need Expo print support. For now, use this option on web or share the backup data."
      );
      return;
    }

    const reportText = buildReportsText();
    const escapedReport = reportText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const printWindow = globalThis.window.open("", "_blank");

    if (!printWindow) {
      Alert.alert("Print blocked", "Allow pop-ups for this app, then try again.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Track and Tally Reports</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #20242C; }
            h1 { color: #1E3A5F; margin-bottom: 8px; }
            pre { white-space: pre-wrap; font-size: 14px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <h1>Track and Tally Reports</h1>
          <pre>${escapedReport}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TopHeader title="Reports" subtitle="Sales, balances, history, and backup" />

      <View style={styles.tabs}>
        <TabButton label="Sales" active={tab === "sales"} onPress={() => setTab("sales")} />
        <TabButton label="Unpaid" active={tab === "unpaid"} onPress={() => setTab("unpaid")} />
        <TabButton label="History" active={tab === "history"} onPress={() => setTab("history")} />
        <TabButton label="Backup" active={tab === "backup"} onPress={() => setTab("backup")} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {tab === "sales" && (
          <>
            <Text style={styles.sectionTitle}>Today summary</Text>
            <View style={styles.summaryGrid}>
              <MetricCard label="Cash sales" value={formatCurrency(todayCash)} />
              <MetricCard label="Utang sales" value={formatCurrency(todayCredit)} danger />
              <MetricCard label="Grand total" value={formatCurrency(todayGrandTotal)} success />
              <MetricCard label="Items sold" value={String(todayItemsSold)} />
            </View>

            <Text style={styles.sectionTitle}>Last 14 days</Text>
            {summary.length === 0 ? (
              <EmptyState icon="bar-chart-outline" title="No sales recorded yet" />
            ) : (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                {summary.map((row, i) => (
                  <View
                    key={row.date}
                    style={[styles.dayRow, i !== summary.length - 1 && styles.rowBorder]}
                  >
                    <Text style={styles.dayDate}>{formatDate(row.date)}</Text>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.dayCredit}>
                        +{formatCurrency(row.cash_total || 0)} cash
                      </Text>
                      <Text style={styles.dayPayment}>
                        +{formatCurrency(row.credit_total ?? row.total_credit_sales)} utang
                      </Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </>
        )}

        {tab === "unpaid" && (
          <>
            <Text style={styles.sectionTitle}>Unpaid balances ({unpaid.length} debtors)</Text>
            <Card style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total outstanding</Text>
              <Text style={styles.totalValue}>{formatCurrency(totalUnpaid)}</Text>
            </Card>
            {unpaid.length === 0 ? (
              <EmptyState icon="checkmark-circle-outline" title="Everyone is settled up" />
            ) : (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                {unpaid.map((d, i) => (
                  <Pressable
                    key={d.id}
                    style={[styles.dayRow, i !== unpaid.length - 1 && styles.rowBorder]}
                    onPress={() => router.push(`/debtors/${d.id}`)}
                  >
                    <Text style={styles.dayDate}>{d.full_name}</Text>
                    <Text style={styles.dayCredit}>{formatCurrency(d.balance)}</Text>
                  </Pressable>
                ))}
              </Card>
            )}
          </>
        )}

        {tab === "history" && (
          <>
            <Text style={styles.sectionTitle}>Recent history</Text>
            {history.length === 0 ? (
              <EmptyState icon="time-outline" title="No activity recorded yet" />
            ) : (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                {history.map((entry, i) => (
                  <View
                    key={entry.id}
                    style={[styles.dayRow, i !== history.length - 1 && styles.rowBorder]}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.dayDate} numberOfLines={1}>
                        {entry.label}
                      </Text>
                      <Text style={styles.metaText} numberOfLines={1}>
                        {entry.debtor_name ? `${entry.debtor_name} - ` : ""}
                        {formatDate(entry.date)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.dayCredit,
                        entry.type === "payment" && styles.paymentAmount,
                      ]}
                    >
                      {entry.type === "payment" ? "-" : "+"}
                      {formatCurrency(entry.amount)}
                    </Text>
                  </View>
                ))}
              </Card>
            )}
          </>
        )}

        {tab === "backup" && (
          <>
            <Text style={styles.sectionTitle}>Backup data</Text>
            <Card style={{ gap: spacing.md }}>
              <View style={styles.backupIcon}>
                <Ionicons name="cloud-upload-outline" size={26} color={colors.navy} />
              </View>
              <View>
                <Text style={styles.backupTitle}>Export local records</Text>
                <Text style={styles.backupText}>
                  Share a JSON backup containing debtors, inventory, sales, and payments.
                </Text>
              </View>
              <Button
                title="Share backup"
                onPress={handleShareBackup}
                loading={backupLoading}
                icon={<Ionicons name="share-outline" size={18} color={colors.white} />}
              />
            </Card>

            <Text style={styles.sectionTitle}>Report output</Text>
            <Card style={{ gap: spacing.md }}>
              <View style={styles.reportOutputHeader}>
                <View style={styles.backupIcon}>
                  <Ionicons name="document-text-outline" size={26} color={colors.navy} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.backupTitle}>Print or save reports</Text>
                  <Text style={styles.backupText}>
                    Create a printable report with sales, unpaid balances, recent history, and stock watch.
                  </Text>
                </View>
              </View>
              <View style={styles.reportActions}>
                <Button
                  title="Print reports"
                  variant="ghost"
                  onPress={() => printReports(false)}
                  icon={<Ionicons name="print-outline" size={18} color={colors.navy} />}
                />
                <Button
                  title="Save as PDF"
                  variant="secondary"
                  onPress={() => printReports(true)}
                  icon={<Ionicons name="download-outline" size={18} color={colors.navyDark} />}
                />
              </View>
            </Card>

            <Text style={styles.sectionTitle}>Inventory watch</Text>
            {lowStock.length === 0 ? (
              <EmptyState icon="cube-outline" title="Stock levels look healthy" />
            ) : (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                {lowStock.map((p, i) => (
                  <Pressable
                    key={p.id}
                    style={[styles.dayRow, i !== lowStock.length - 1 && styles.rowBorder]}
                    onPress={() => router.push(`/inventory/${p.id}`)}
                  >
                    <Text style={styles.dayDate}>{p.name}</Text>
                    <Text style={styles.dayCredit}>{p.stock_quantity} left</Text>
                  </Pressable>
                ))}
              </Card>
            )}
          </>
        )}
      </ScrollView>
      <BottomNav activeTab="reports" />
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress }) {
  return (
    <Pressable style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function MetricCard({ label, value, danger = false, success = false }) {
  return (
    <Card style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={[
          styles.metricValue,
          danger && { color: colors.danger },
          success && { color: colors.success },
        ]}
      >
        {value}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  tabs: { flexDirection: "row", width: "100%", marginBottom: spacing.sm },
  tabBtn: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: colors.white,
    borderBottomWidth: 3,
    borderBottomColor: colors.border,
  },
  tabBtnActive: { borderBottomColor: colors.navy },
  tabText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  tabTextActive: { color: colors.navy },
  container: {
    padding: spacing.md,
    paddingTop: 0,
    gap: spacing.md,
    paddingBottom: bottomNavHeight + spacing.xl,
  },
  sectionTitle: { ...typography.heading, fontSize: 15 },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metricCard: {
    width: "48%",
    minHeight: 96,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: radius.sm,
  },
  metricLabel: { fontSize: 13, color: colors.textMuted, textAlign: "center" },
  metricValue: { fontSize: 22, fontWeight: "800", color: colors.text, textAlign: "center" },
  totalCard: { alignItems: "center", backgroundColor: colors.navy, gap: 4, borderWidth: 0 },
  totalLabel: { color: colors.goldLight, fontSize: 12, fontWeight: "600" },
  totalValue: { color: colors.white, fontSize: 26, fontWeight: "800" },
  dayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  dayDate: { fontSize: 14, fontWeight: "700", color: colors.text },
  dayCredit: { fontSize: 13, fontWeight: "700", color: colors.danger },
  dayPayment: { fontSize: 12, color: colors.success, marginTop: 2 },
  metaText: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  paymentAmount: { color: colors.success },
  backupIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  backupTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  backupText: { fontSize: 13, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  reportOutputHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  reportActions: {
    gap: spacing.sm,
  },
});
