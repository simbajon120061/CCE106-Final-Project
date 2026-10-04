import { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography, radius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import TopHeader from "@/components/TopHeader";
import { formatCurrency } from "@/lib/format";
import {
  getDailySalesSummary,
  getTodayCreditItemCount,
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
    outOfStockCount: 0,
  });

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadDashboard() {
        const now = new Date();
        const todayIso = [
          now.getFullYear(),
          String(now.getMonth() + 1).padStart(2, "0"),
          String(now.getDate()).padStart(2, "0"),
        ].join("-");

        const [summaryRows, outstanding, lowStock, itemRow] =
          await Promise.all([
            getDailySalesSummary(db, user?.id, 1),
            getTotalOutstanding(db, user?.id),
            getLowStockProducts(db, user?.id),
            getTodayCreditItemCount(db, user?.id),
          ]);

        if (!active) return;

        const todaySummary = summaryRows.find(
          (row) => row.date === todayIso
        );

        const utangSales =
          todaySummary?.credit_total ??
          todaySummary?.total_credit_sales ??
          0;

        const cashSales = todaySummary?.cash_total ?? 0;
        const outOfStock = lowStock.filter(
          (product) => Number(product.stock_quantity) <= 0
        );
        const lowStockOnly = lowStock.filter(
          (product) => Number(product.stock_quantity) > 0
        );

        setStats({
          todaySales: cashSales + utangSales,
          cashSales,
          utangSales,
          outstanding,
          itemsSold:
            todaySummary?.item_count ?? itemRow ?? 0,
          lowStockCount: lowStockOnly.length,
          outOfStockCount: outOfStock.length,
        });
      }

      loadDashboard();

      return () => {
        active = false;
      };
    }, [db, user?.id])
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
      <TopHeader
        title="Home"
        subtitle={user?.storeName || "My Store"}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* DATE / WELCOME AREA */}
        <View style={styles.welcomeArea}>
          <View>
            <Text style={styles.welcomeSmall}>TODAY'S OVERVIEW</Text>
            <Text style={styles.dateText}>{todayLabel}</Text>
          </View>

          <View style={styles.calendarIcon}>
            <Ionicons
              name="calendar-outline"
              size={22}
              color={colors.gold}
            />
          </View>
        </View>

        {/* SALES SUMMARY */}
        <View style={styles.summaryRow}>
          <MetricCard
            label="Today's Sales"
            value={formatCurrency(stats.todaySales)}
            tone="good"
            icon="trending-up"
          />

          <MetricCard
            label="Outstanding Utang"
            value={formatCurrency(stats.outstanding)}
            tone="danger"
            icon="alert-circle"
          />
        </View>

        {/* LOW STOCK ALERT */}
        {stats.lowStockCount > 0 && (
          <Pressable
            style={({ pressed }) => [
              styles.alertBanner,
              pressed && styles.alertPressed,
            ]}
            onPress={() =>
              router.push({
                pathname: "/inventory",
                params: { filter: "low" },
              })
            }
          >
            <View style={styles.alertIconContainer}>
              <Ionicons
                name="warning"
                size={22}
                color={colors.danger}
              />
            </View>

            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Low Stock Alert</Text>

              <Text style={styles.alertText}>
                {stats.lowStockCount} product
                {stats.lowStockCount === 1 ? "" : "s"} low on stock
              </Text>
            </View>

            <View style={styles.alertArrow}>
              <Ionicons
                name="chevron-forward"
                size={19}
                color={colors.danger}
              />
            </View>
          </Pressable>
        )}

        {stats.outOfStockCount > 0 && (
          <Pressable
            style={({ pressed }) => [
              styles.alertBanner,
              pressed && styles.alertPressed,
            ]}
            onPress={() =>
              router.push({
                pathname: "/inventory",
                params: { filter: "out" },
              })
            }
          >
            <View style={styles.alertIconContainer}>
              <Ionicons
                name="close-circle"
                size={22}
                color={colors.danger}
              />
            </View>

            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Out of Stock Alert</Text>

              <Text style={styles.alertText}>
                {stats.outOfStockCount} product
                {stats.outOfStockCount === 1 ? "" : "s"} need restocking
              </Text>
            </View>

            <View style={styles.alertArrow}>
              <Ionicons
                name="chevron-forward"
                size={19}
                color={colors.danger}
              />
            </View>
          </Pressable>
        )}

        {/* QUICK ACTIONS */}
        <SectionHeader
          title="Quick Actions"
          subtitle="Manage your store"
        />

        <View style={styles.actionGrid}>
          {quickActions.map((item) => (
            <ActionCard
              key={item.title}
              item={item}
              onPress={() => router.push(item.route)}
            />
          ))}
        </View>

        {/* TODAY AT A GLANCE */}
        <SectionHeader
          title="Today at a Glance"
          subtitle="Your daily activity"
        />

        <View style={styles.glanceContainer}>
          <GlanceCard
            label="Cash Sales"
            value={formatCurrency(stats.cashSales)}
            icon="cash-outline"
            iconType="cash"
          />

          <GlanceCard
            label="Utang Sales"
            value={formatCurrency(stats.utangSales)}
            icon="wallet-outline"
            iconType="danger"
            danger
          />

          <GlanceCard
            label="Items Sold"
            value={String(stats.itemsSold)}
            icon="cube-outline"
            iconType="items"
          />
        </View>

        {/* BOTTOM DECORATIVE BRAND AREA */}
        <View style={styles.brandFooter}>
          <View style={styles.brandLine} />

          <View style={styles.brandMark}>
            <Ionicons
              name="stats-chart"
              size={14}
              color={colors.gold}
            />
          </View>

          <Text style={styles.brandFooterText}>
            Track & Tally
          </Text>

          <View style={styles.brandLine} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* -------------------------------------------------------------------------- */
/* SECTION HEADER */
/* -------------------------------------------------------------------------- */

function SectionHeader({ title, subtitle }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionAccent} />

        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* METRIC CARD */
/* -------------------------------------------------------------------------- */

function MetricCard({ label, value, tone, icon }) {
  const isDanger = tone === "danger";

  return (
    <View style={styles.metricCard}>
      <View style={styles.metricTop}>
        <View
          style={[
            styles.metricIcon,
            isDanger
              ? styles.metricIconDanger
              : styles.metricIconGood,
          ]}
        >
          <Ionicons
            name={icon}
            size={20}
            color={isDanger ? colors.danger : colors.success}
          />
        </View>

        <Ionicons
          name="ellipsis-horizontal"
          size={19}
          color={colors.border}
        />
      </View>

      <Text style={styles.metricLabel}>{label}</Text>

      <Text
        style={[
          styles.metricValue,
          tone === "good" && styles.metricGood,
          tone === "danger" && styles.metricDanger,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>

      <View
        style={[
          styles.metricBottomLine,
          isDanger
            ? styles.metricBottomDanger
            : styles.metricBottomGood,
        ]}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* QUICK ACTION CARD */
/* -------------------------------------------------------------------------- */

function ActionCard({ item, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionCard,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.actionIconOuter}>
        <View style={styles.actionIconInner}>
          <Ionicons
            name={item.icon}
            size={27}
            color={colors.navy}
          />
        </View>
      </View>

      <View style={styles.actionTextContainer}>
        <Text style={styles.actionTitle}>{item.title}</Text>

        <View style={styles.actionArrow}>
          <Ionicons
            name="arrow-forward"
            size={14}
            color={colors.gold}
          />
        </View>
      </View>
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */
/* GLANCE CARD */
/* -------------------------------------------------------------------------- */

function GlanceCard({
  label,
  value,
  icon,
  iconType,
  danger,
}) {
  return (
    <View style={styles.glanceCard}>
      <View
        style={[
          styles.glanceIcon,
          iconType === "danger" && styles.glanceIconDanger,
          iconType === "cash" && styles.glanceIconCash,
          iconType === "items" && styles.glanceIconItems,
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={
            danger
              ? colors.danger
              : iconType === "cash"
              ? colors.success
              : colors.navy
          }
        />
      </View>

      <Text style={styles.glanceLabel}>{label}</Text>

      <Text
        style={[
          styles.glanceValue,
          danger && styles.metricDanger,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* STYLES */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },

  /* DATE */

  welcomeArea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },

  welcomeSmall: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
    color: colors.gold,
    marginBottom: 4,
  },

  dateText: {
    fontSize: 18,
    color: colors.navy,
    fontWeight: "800",
  },

  calendarIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",

    shadowColor: colors.navy,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  /* SUMMARY */

  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  metricCard: {
    flex: 1,
    minHeight: 145,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    overflow: "hidden",

    shadowColor: colors.navy,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },

  metricTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  metricIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  metricIconGood: {
    backgroundColor: "#EAF6EF",
  },

  metricIconDanger: {
    backgroundColor: "#FDECEA",
  },

  metricLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "700",
    marginBottom: 4,
  },

  metricValue: {
    fontSize: 20,
    color: colors.navy,
    fontWeight: "900",
  },

  metricGood: {
    color: colors.success,
  },

  metricDanger: {
    color: colors.danger,
  },

  metricBottomLine: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
  },

  metricBottomGood: {
    backgroundColor: colors.success,
  },

  metricBottomDanger: {
    backgroundColor: colors.danger,
  },

  /* ALERT */

  alertBanner: {
    minHeight: 76,
    backgroundColor: "#FFF7F5",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#F1D2CD",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",

    shadowColor: colors.danger,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.06,
    shadowRadius: 7,
    elevation: 2,
  },

  alertPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },

  alertIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#FDECEA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  alertContent: {
    flex: 1,
  },

  alertTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.danger,
    marginBottom: 3,
  },

  alertText: {
    fontSize: 11.5,
    color: colors.textMuted,
    fontWeight: "600",
    lineHeight: 17,
  },

  alertArrow: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: "#FDECEA",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  /* SECTION */

  sectionHeader: {
    marginTop: 3,
    marginBottom: -3,
  },

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  sectionAccent: {
    width: 4,
    height: 28,
    borderRadius: 4,
    backgroundColor: colors.gold,
    marginRight: 10,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.navy,
  },

  sectionSubtitle: {
    marginTop: 1,
    fontSize: 10.5,
    fontWeight: "600",
    color: colors.textMuted,
  },

  /* QUICK ACTIONS */

  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: spacing.sm,
  },

  actionCard: {
    width: "48.5%",
    minHeight: 126,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    justifyContent: "space-between",

    shadowColor: colors.navy,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  actionIconOuter: {
    width: 49,
    height: 49,
    borderRadius: 16,
    backgroundColor: "#F7F4EA",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ECE4CD",
  },

  actionIconInner: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },

  actionTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },

  actionTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    marginRight: 5,
  },

  actionArrow: {
    width: 25,
    height: 25,
    borderRadius: 9,
    backgroundColor: "#F7F4EA",
    alignItems: "center",
    justifyContent: "center",
  },

  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },

  /* GLANCE */

  glanceContainer: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  glanceCard: {
    flex: 1,
    minHeight: 124,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,

    shadowColor: colors.navy,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  glanceIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: "#F1F4F8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  glanceIconCash: {
    backgroundColor: "#EAF6EF",
  },

  glanceIconDanger: {
    backgroundColor: "#FDECEA",
  },

  glanceIconItems: {
    backgroundColor: "#F7F4EA",
  },

  glanceLabel: {
    fontSize: 10.5,
    color: colors.textMuted,
    fontWeight: "700",
    textAlign: "center",
  },

  glanceValue: {
    marginTop: 4,
    fontSize: 16,
    color: colors.navy,
    fontWeight: "900",
    textAlign: "center",
  },

  /* FOOTER */

  brandFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
    paddingVertical: 8,
    gap: 8,
  },

  brandLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },

  brandMark: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },

  brandFooterText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: colors.textMuted,
  },
});
