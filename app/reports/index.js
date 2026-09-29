import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Share,
  Platform,
} from "react-native";
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

import {
  colors,
  spacing,
  typography,
  radius,
} from "@/constants/theme";

import {
  formatCurrency,
  formatDate,
} from "@/lib/format";

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

  const totalUnpaid = unpaid.reduce(
    (sum, d) => sum + d.balance,
    0
  );

  const today = summary[0];

  const todayCash = today?.cash_total || 0;

  const todayCredit =
    today?.credit_total ??
    today?.total_credit_sales ??
    0;

  const todayGrandTotal =
    todayCash + todayCredit;

  const todayItemsSold =
    today?.item_count || 0;

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

      Alert.alert(
        "Export failed",
        "Please try again."
      );
    } finally {
      setBackupLoading(false);
    }
  }

  function buildReportsText() {
    const generatedDate =
      new Date().toLocaleDateString("en-PH", {
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
      ...unpaid.map(
        (debtor) =>
          `${debtor.full_name}: ${formatCurrency(
            debtor.balance
          )}`
      ),
      "",
      "Inventory Watch",
      ...(lowStock.length
        ? lowStock.map(
            (product) =>
              `${product.name}: ${product.stock_quantity} left`
          )
        : ["Stock levels look healthy"]),
      "",
      "Recent History",
      ...(history.length
        ? history.map(
            (entry) =>
              `${formatDate(entry.date)} - ${
                entry.label
              }${
                entry.debtor_name
                  ? ` - ${entry.debtor_name}`
                  : ""
              }: ${formatCurrency(entry.amount)}`
          )
        : ["No activity recorded yet"]),
    ];

    return lines.join("\n");
  }

  function printReports(saveAsPdf = false) {
    if (
      Platform.OS !== "web" ||
      !globalThis.window?.open
    ) {
      Alert.alert(
        saveAsPdf
          ? "Save as PDF"
          : "Print reports",
        "Native print and PDF export need Expo print support. For now, use this option on web or share the backup data."
      );

      return;
    }

    const reportText = buildReportsText();

    const escapedReport = reportText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const printWindow =
      globalThis.window.open("", "_blank");

    if (!printWindow) {
      Alert.alert(
        "Print blocked",
        "Allow pop-ups for this app, then try again."
      );

      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Track and Tally Reports</title>

          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 32px;
              color: #20242C;
            }

            h1 {
              color: #1E3A5F;
              margin-bottom: 8px;
            }

            pre {
              white-space: pre-wrap;
              font-size: 14px;
              line-height: 1.5;
            }
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
    <SafeAreaView
      style={styles.safe}
      edges={["top"]}
    >
      <TopHeader
        title="Reports"
        subtitle="Sales, balances, history, and backup"
      />

      {/* TAB NAVIGATION */}
      <View style={styles.tabsOuter}>
        <View style={styles.tabs}>
          <TabButton
            icon="bar-chart-outline"
            label="Sales"
            active={tab === "sales"}
            onPress={() => setTab("sales")}
          />

          <TabButton
            icon="wallet-outline"
            label="Unpaid"
            active={tab === "unpaid"}
            onPress={() => setTab("unpaid")}
          />

          <TabButton
            icon="time-outline"
            label="History"
            active={tab === "history"}
            onPress={() => setTab("history")}
          />

          <TabButton
            icon="cloud-outline"
            label="Backup"
            active={tab === "backup"}
            onPress={() => setTab("backup")}
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* SALES */}
        {tab === "sales" && (
          <>
            <SectionHeader
              icon="stats-chart-outline"
              title="Today summary"
              subtitle="Your sales performance today"
            />

            <View style={styles.summaryGrid}>
              <MetricCard
                icon="cash-outline"
                label="Cash sales"
                value={formatCurrency(todayCash)}
                iconBackground="cream"
              />

              <MetricCard
                icon="wallet-outline"
                label="Utang sales"
                value={formatCurrency(todayCredit)}
                danger
                iconBackground="danger"
              />

              <MetricCard
                icon="trending-up-outline"
                label="Grand total"
                value={formatCurrency(todayGrandTotal)}
                success
                iconBackground="success"
              />

              <MetricCard
                icon="cube-outline"
                label="Items sold"
                value={String(todayItemsSold)}
                iconBackground="cream"
              />
            </View>

            <SectionHeader
              icon="calendar-outline"
              title="Last 14 days"
              subtitle="Daily sales activity"
            />

            {summary.length === 0 ? (
              <EmptyState
                icon="bar-chart-outline"
                title="No sales recorded yet"
              />
            ) : (
              <Card style={styles.listCard}>
                {summary.map((row, i) => (
                  <View
                    key={row.date}
                    style={[
                      styles.dayRow,
                      i !== summary.length - 1 &&
                        styles.rowBorder,
                    ]}
                  >
                    <View style={styles.dateIcon}>
                      <Ionicons
                        name="calendar-outline"
                        size={17}
                        color={colors.navy}
                      />
                    </View>

                    <View style={styles.rowMain}>
                      <Text style={styles.dayDate}>
                        {formatDate(row.date)}
                      </Text>

                      <Text style={styles.rowSubtext}>
                        Daily sales
                      </Text>
                    </View>

                    <View style={styles.rowAmounts}>
                      <View style={styles.amountLine}>
                        <View
                          style={[
                            styles.amountDot,
                            styles.cashDot,
                          ]}
                        />

                        <Text
                          style={styles.dayCredit}
                        >
                          +{formatCurrency(
                            row.cash_total || 0
                          )}{" "}
                          cash
                        </Text>
                      </View>

                      <View style={styles.amountLine}>
                        <View
                          style={[
                            styles.amountDot,
                            styles.creditDot,
                          ]}
                        />

                        <Text
                          style={styles.dayPayment}
                        >
                          +{formatCurrency(
                            row.credit_total ??
                              row.total_credit_sales
                          )}{" "}
                          utang
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </>
        )}

        {/* UNPAID */}
        {tab === "unpaid" && (
          <>
            <SectionHeader
              icon="wallet-outline"
              title={`Unpaid balances (${unpaid.length})`}
              subtitle="Customers with outstanding balances"
            />

            <View style={styles.outstandingCard}>
              <View style={styles.outstandingIcon}>
                <Ionicons
                  name="alert-circle-outline"
                  size={24}
                  color={colors.goldLight}
                />
              </View>

              <View style={styles.outstandingInfo}>
                <Text style={styles.totalLabel}>
                  Total outstanding
                </Text>

                <Text style={styles.totalValue}>
                  {formatCurrency(totalUnpaid)}
                </Text>

                <Text style={styles.outstandingHint}>
                  {unpaid.length === 1
                    ? "1 debtor with balance"
                    : `${unpaid.length} debtors with balances`}
                </Text>
              </View>
            </View>

            {unpaid.length === 0 ? (
              <EmptyState
                icon="checkmark-circle-outline"
                title="Everyone is settled up"
              />
            ) : (
              <Card style={styles.listCard}>
                {unpaid.map((d, i) => (
                  <Pressable
                    key={d.id}
                    style={({ pressed }) => [
                      styles.dayRow,
                      i !== unpaid.length - 1 &&
                        styles.rowBorder,
                      pressed &&
                        styles.rowPressed,
                    ]}
                    onPress={() =>
                      router.push(
                        `/debtors/${d.id}`
                      )
                    }
                  >
                    <View style={styles.personIcon}>
                      <Ionicons
                        name="person-outline"
                        size={17}
                        color={colors.navy}
                      />
                    </View>

                    <View style={styles.rowMain}>
                      <Text
                        style={styles.dayDate}
                        numberOfLines={1}
                      >
                        {d.full_name}
                      </Text>

                      <Text style={styles.rowSubtext}>
                        Outstanding balance
                      </Text>
                    </View>

                    <View style={styles.balanceRight}>
                      <Text style={styles.balanceAmount}>
                        {formatCurrency(d.balance)}
                      </Text>

                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={colors.textMuted}
                      />
                    </View>
                  </Pressable>
                ))}
              </Card>
            )}
          </>
        )}

        {/* HISTORY */}
        {tab === "history" && (
          <>
            <SectionHeader
              icon="time-outline"
              title="Recent history"
              subtitle="Your latest transactions"
            />

            {history.length === 0 ? (
              <EmptyState
                icon="time-outline"
                title="No activity recorded yet"
              />
            ) : (
              <Card style={styles.listCard}>
                {history.map((entry, i) => (
                  <View
                    key={entry.id}
                    style={[
                      styles.dayRow,
                      i !== history.length - 1 &&
                        styles.rowBorder,
                    ]}
                  >
                    <View
                      style={[
                        styles.historyIcon,
                        entry.type === "payment"
                          ? styles.historyPaymentIcon
                          : styles.historySaleIcon,
                      ]}
                    >
                      <Ionicons
                        name={
                          entry.type === "payment"
                            ? "arrow-down-outline"
                            : "cart-outline"
                        }
                        size={17}
                        color={
                          entry.type === "payment"
                            ? colors.success
                            : colors.navy
                        }
                      />
                    </View>

                    <View style={styles.rowMain}>
                      <Text
                        style={styles.dayDate}
                        numberOfLines={1}
                      >
                        {entry.label}
                      </Text>

                      <Text
                        style={styles.metaText}
                        numberOfLines={1}
                      >
                        {entry.debtor_name
                          ? `${entry.debtor_name} - `
                          : ""}
                        {formatDate(entry.date)}
                      </Text>
                    </View>

                    <View style={styles.historyAmountBox}>
                      <Text
                        style={[
                          styles.historyAmount,
                          entry.type ===
                            "payment" &&
                            styles.paymentAmount,
                        ]}
                      >
                        {entry.type === "payment"
                          ? "-"
                          : "+"}
                        {formatCurrency(
                          entry.amount
                        )}
                      </Text>

                      <Text style={styles.historyType}>
                        {entry.type ===
                        "payment"
                          ? "Payment"
                          : "Sale"}
                      </Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </>
        )}

        {/* BACKUP */}
        {tab === "backup" && (
          <>
            <SectionHeader
              icon="cloud-upload-outline"
              title="Backup data"
              subtitle="Protect and export your local records"
            />

            <Card style={styles.featureCard}>
              <View style={styles.featureTop}>
                <View style={styles.featureIcon}>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={26}
                    color={colors.navy}
                  />
                </View>

                <View style={styles.featureBadge}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={12}
                    color={colors.success}
                  />

                  <Text style={styles.featureBadgeText}>
                    LOCAL DATA
                  </Text>
                </View>
              </View>

              <Text style={styles.backupTitle}>
                Export local records
              </Text>

              <Text style={styles.backupText}>
                Share a JSON backup containing
                debtors, inventory, sales, and
                payments.
              </Text>

              <View style={styles.infoStrip}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={colors.navy}
                />

                <Text style={styles.infoStripText}>
                  Keep a backup somewhere safe so
                  your records are easy to restore.
                </Text>
              </View>

              <Button
                title="Share backup"
                onPress={handleShareBackup}
                loading={backupLoading}
                icon={
                  <Ionicons
                    name="share-outline"
                    size={18}
                    color={colors.white}
                  />
                }
              />
            </Card>

            <SectionHeader
              icon="document-text-outline"
              title="Report output"
              subtitle="Print or save a readable report"
            />

            <Card style={styles.featureCard}>
              <View style={styles.reportOutputHeader}>
                <View style={styles.featureIcon}>
                  <Ionicons
                    name="document-text-outline"
                    size={26}
                    color={colors.navy}
                  />
                </View>

                <View style={styles.reportHeaderText}>
                  <Text style={styles.backupTitle}>
                    Print or save reports
                  </Text>

                  <Text style={styles.backupText}>
                    Create a printable report with
                    sales, unpaid balances, recent
                    history, and stock watch.
                  </Text>
                </View>
              </View>

              <View style={styles.reportActions}>
                <Button
                  title="Print reports"
                  variant="ghost"
                  onPress={() =>
                    printReports(false)
                  }
                  icon={
                    <Ionicons
                      name="print-outline"
                      size={18}
                      color={colors.navy}
                    />
                  }
                />

                <Button
                  title="Save as PDF"
                  variant="secondary"
                  onPress={() =>
                    printReports(true)
                  }
                  icon={
                    <Ionicons
                      name="download-outline"
                      size={18}
                      color={colors.navyDark}
                    />
                  }
                />
              </View>
            </Card>

            <SectionHeader
              icon="cube-outline"
              title="Inventory watch"
              subtitle="Products that need attention"
            />

            {lowStock.length === 0 ? (
              <View style={styles.healthyCard}>
                <View style={styles.healthyIcon}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={24}
                    color={colors.success}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.healthyTitle}>
                    Stock levels look healthy
                  </Text>

                  <Text style={styles.healthyText}>
                    No low-stock products need
                    attention right now.
                  </Text>
                </View>
              </View>
            ) : (
              <Card style={styles.listCard}>
                {lowStock.map((p, i) => (
                  <Pressable
                    key={p.id}
                    style={({ pressed }) => [
                      styles.dayRow,
                      i !== lowStock.length - 1 &&
                        styles.rowBorder,
                      pressed &&
                        styles.rowPressed,
                    ]}
                    onPress={() =>
                      router.push(
                        `/inventory/${p.id}`
                      )
                    }
                  >
                    <View style={styles.stockWarningIcon}>
                      <Ionicons
                        name="warning-outline"
                        size={17}
                        color={colors.danger}
                      />
                    </View>

                    <View style={styles.rowMain}>
                      <Text
                        style={styles.dayDate}
                        numberOfLines={1}
                      >
                        {p.name}
                      </Text>

                      <Text style={styles.rowSubtext}>
                        Low stock
                      </Text>
                    </View>

                    <View style={styles.stockRight}>
                      <Text style={styles.stockNumber}>
                        {p.stock_quantity}
                      </Text>

                      <Text style={styles.stockLeft}>
                        left
                      </Text>

                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={colors.textMuted}
                      />
                    </View>
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

function SectionHeader({
  icon,
  title,
  subtitle,
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={colors.navy}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>
          {title}
        </Text>

        <Text style={styles.sectionSubtitle}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function TabButton({
  label,
  icon,
  active,
  onPress,
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.tabBtn,
        active && styles.tabBtnActive,
        pressed && styles.tabPressed,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.tabIcon,
          active && styles.tabIconActive,
        ]}
      >
        <Ionicons
          name={icon}
          size={16}
          color={
            active
              ? colors.white
              : colors.textMuted
          }
        />
      </View>

      <Text
        style={[
          styles.tabText,
          active && styles.tabTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function MetricCard({
  label,
  value,
  icon,
  danger = false,
  success = false,
  iconBackground = "cream",
}) {
  return (
    <Card style={styles.metricCard}>
      <View
        style={[
          styles.metricIcon,
          iconBackground === "danger" &&
            styles.metricIconDanger,
          iconBackground === "success" &&
            styles.metricIconSuccess,
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={
            danger
              ? colors.danger
              : success
              ? colors.success
              : colors.navy
          }
        />
      </View>

      <Text style={styles.metricLabel}>
        {label}
      </Text>

      <Text
        style={[
          styles.metricValue,
          danger && {
            color: colors.danger,
          },
          success && {
            color: colors.success,
          },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },

  /* ---------------- HEADER TABS ---------------- */

  tabsOuter: {
    paddingHorizontal: spacing.md,
    paddingTop: 4,
    paddingBottom: spacing.sm,
  },

  tabs: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,

    shadowColor: colors.navy,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 2,
  },

  tabBtn: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },

  tabBtnActive: {
    backgroundColor: colors.navy,
  },

  tabPressed: {
    opacity: 0.78,
    transform: [
      {
        scale: 0.97,
      },
    ],
  },

  tabIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  tabIconActive: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  tabText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textMuted,
  },

  tabTextActive: {
    color: colors.white,
  },

  /* ---------------- SCROLL CONTENT ---------------- */

  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom:
      bottomNavHeight + spacing.xl + 20,
    gap: spacing.md,
  },

  /* ---------------- SECTION HEADER ---------------- */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 4,
  },

  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",

    shadowColor: colors.navy,
    shadowOpacity: 0.035,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 1,
  },

  sectionTitle: {
    ...typography.heading,
    fontSize: 15,
    color: colors.navy,
  },

  sectionSubtitle: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },

  /* ---------------- SUMMARY ---------------- */

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  metricCard: {
    width: "48%",
    flexGrow: 1,
    minHeight: 124,
    borderRadius: 18,
    alignItems: "flex-start",
    justifyContent: "center",
    padding: 15,
    gap: 6,
  },

  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },

  metricIconDanger: {
    backgroundColor: "rgba(190,70,70,0.10)",
  },

  metricIconSuccess: {
    backgroundColor: "rgba(55,140,90,0.10)",
  },

  metricLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "700",
  },

  metricValue: {
    fontSize: 19,
    fontWeight: "900",
    color: colors.text,
    maxWidth: "100%",
  },

  /* ---------------- LIST CARDS ---------------- */

  listCard: {
    padding: 0,
    overflow: "hidden",
    borderRadius: 18,
  },

  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 13,
    paddingVertical: 13,
    minHeight: 70,
  },

  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  rowPressed: {
    backgroundColor: colors.cream,
  },

  dateIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  personIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  rowMain: {
    flex: 1,
    minWidth: 0,
  },

  dayDate: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.text,
  },

  rowSubtext: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 3,
  },

  metaText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },

  rowAmounts: {
    alignItems: "flex-end",
    gap: 5,
  },

  amountLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  amountDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },

  cashDot: {
    backgroundColor: colors.navy,
  },

  creditDot: {
    backgroundColor: colors.success,
  },

  dayCredit: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.danger,
  },

  dayPayment: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.success,
  },

  /* ---------------- UNPAID ---------------- */

  outstandingCard: {
    backgroundColor: colors.navy,
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,

    shadowColor: colors.navy,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 5,
  },

  outstandingIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  outstandingInfo: {
    flex: 1,
  },

  totalLabel: {
    color: colors.goldLight,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  totalValue: {
    color: colors.white,
    fontSize: 27,
    fontWeight: "900",
    marginTop: 2,
  },

  outstandingHint: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 10,
    marginTop: 2,
  },

  balanceRight: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 6,
  },

  balanceAmount: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "900",
  },

  /* ---------------- HISTORY ---------------- */

  historyIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  historySaleIcon: {
    backgroundColor: colors.cream,
  },

  historyPaymentIcon: {
    backgroundColor: "rgba(55,140,90,0.10)",
  },

  historyAmountBox: {
    alignItems: "flex-end",
    minWidth: 72,
  },

  historyAmount: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.navy,
  },

  paymentAmount: {
    color: colors.success,
  },

  historyType: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 3,
    fontWeight: "700",
  },

  /* ---------------- BACKUP ---------------- */

  featureCard: {
    borderRadius: 20,
    gap: spacing.sm,
    padding: 17,
  },

  featureTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },

  featureIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },

  featureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: "rgba(55,140,90,0.10)",
  },

  featureBadgeText: {
    fontSize: 8,
    fontWeight: "900",
    color: colors.success,
    letterSpacing: 0.4,
  },

  backupTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.text,
    marginTop: 3,
  },

  backupText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
    lineHeight: 18,
  },

  infoStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.cream,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginTop: 4,
    marginBottom: 3,
  },

  infoStripText: {
    flex: 1,
    fontSize: 10,
    color: colors.textMuted,
    lineHeight: 15,
  },

  reportOutputHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  reportHeaderText: {
    flex: 1,
  },

  reportActions: {
    gap: spacing.sm,
    marginTop: 5,
  },

  /* ---------------- INVENTORY WATCH ---------------- */

  stockWarningIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(190,70,70,0.10)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  stockRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  stockNumber: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.danger,
  },

  stockLeft: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "700",
    marginRight: 2,
  },

  healthyCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(55,140,90,0.18)",
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,

    shadowColor: colors.navy,
    shadowOpacity: 0.035,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 1,
  },

  healthyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(55,140,90,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  healthyTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.text,
  },

  healthyText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 3,
    lineHeight: 15,
  },
});


