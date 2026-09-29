import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useCallback, useMemo } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import EmptyState from "@/components/EmptyState";
import BottomNav, { bottomNavHeight } from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { colors, spacing, radius } from "@/constants/theme";
import { formatCurrency } from "@/lib/format";
import { getDebtors } from "@/db/database";

/*
 * A-Z AVATAR COLORS
 * Each first letter gets its own color.
 */
const avatarColors = {
  A: "#3B82F6",
  B: "#8B5CF6",
  C: "#EC4899",
  D: "#EF4444",
  E: "#F97316",
  F: "#F59E0B",
  G: "#EAB308",
  H: "#84CC16",
  I: "#22C55E",
  J: "#10B981",
  K: "#14B8A6",
  L: "#06B6D4",
  M: "#0EA5E9",
  N: "#2563EB",
  O: "#4F46E5",
  P: "#7C3AED",
  Q: "#A855F7",
  R: "#D946EF",
  S: "#DB2777",
  T: "#E11D48",
  U: "#DC2626",
  V: "#EA580C",
  W: "#CA8A04",
  X: "#65A30D",
  Y: "#16A34A",
  Z: "#059669",
};

const getAvatarColor = (name) => {
  const initial =
    name?.trim()?.charAt(0)?.toUpperCase() || "D";

  return avatarColors[initial] || colors.navy;
};

export default function DebtorsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  const [debtors, setDebtors] = useState([]);
  const [query, setQuery] = useState("");
  const [sortDirection, setSortDirection] = useState("desc");

  const load = useCallback(
    async (q) => {
      try {
        const rows = await getDebtors(
          db,
          q?.trim() || undefined
        );

        setDebtors(rows || []);
      } catch (error) {
        console.error("Failed to load debtors:", error);
      }
    },
    [db]
  );

  useFocusEffect(
    useCallback(() => {
      load(query);
    }, [load, query])
  );

  const totalOwed = useMemo(
    () =>
      debtors.reduce(
        (sum, debtor) =>
          sum + Math.max(debtor.balance || 0, 0),
        0
      ),
    [debtors]
  );

  const activeDebtorsCount = useMemo(
    () =>
      debtors.filter(
        (debtor) => (debtor.balance || 0) > 0
      ).length,
    [debtors]
  );

  const sortedDebtors = useMemo(() => {
    const direction =
      sortDirection === "asc" ? 1 : -1;

    return [...debtors].sort((a, b) => {
      const balanceDiff =
        ((a.balance || 0) -
          (b.balance || 0)) *
        direction;

      if (balanceDiff !== 0) {
        return balanceDiff;
      }

      return (a.full_name || "").localeCompare(
        b.full_name || ""
      );
    });
  }, [debtors, sortDirection]);

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top"]}
    >
      <TopHeader
        title="Debtors"
        subtitle={`${activeDebtorsCount} active credit ${
          activeDebtorsCount === 1
            ? "account"
            : "accounts"
        }`}
      />

      <View style={styles.content}>
        {/* TOTAL OUTSTANDING */}
        <View style={styles.totalBanner}>
          <View style={styles.totalGlowOne} />
          <View style={styles.totalGlowTwo} />

          <View style={styles.totalIcon}>
            <Ionicons
              name="wallet"
              size={21}
              color={colors.goldLight}
            />
          </View>

          <View style={styles.totalInfo}>
            <Text style={styles.totalEyebrow}>
              OVERVIEW
            </Text>

            <Text style={styles.totalLabel}>
              Total Outstanding
            </Text>

            <Text style={styles.totalSubtext}>
              {activeDebtorsCount} active credit{" "}
              {activeDebtorsCount === 1
                ? "account"
                : "accounts"}
            </Text>
          </View>

          <View style={styles.totalAmountWrap}>
            <Text style={styles.totalAmountLabel}>
              TOTAL UTANG
            </Text>

            <Text style={styles.totalAmount}>
              {formatCurrency(totalOwed)}
            </Text>
          </View>
        </View>

        {/* SEARCH */}
        <View style={styles.searchWrap}>
          <View style={styles.searchIconWrap}>
            <Ionicons
              name="search"
              size={17}
              color={colors.navy}
            />
          </View>

          <TextInput
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              load(text);
            }}
            placeholder="Search customer name..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {query.length > 0 && (
            <Pressable
              onPress={() => {
                setQuery("");
                load("");
              }}
              hitSlop={8}
              style={styles.clearSearch}
            >
              <Ionicons
                name="close-circle"
                size={19}
                color={colors.textMuted}
              />
            </Pressable>
          )}
        </View>

        {/* SORT */}
        <View style={styles.sortCard}>
          <View style={styles.sortInfo}>
            <View style={styles.sortTitleRow}>
              <View style={styles.sortIcon}>
                <Ionicons
                  name="swap-vertical"
                  size={15}
                  color={colors.navy}
                />
              </View>

              <View>
                <Text style={styles.sortLabel}>
                  Sort by balance
                </Text>

                <Text style={styles.sortHint}>
                  {sortDirection === "desc"
                    ? "Highest utang first"
                    : "Lowest utang first"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sortControls}>
            <Pressable
              style={[
                styles.sortBtn,
                sortDirection === "asc" &&
                  styles.sortBtnActive,
              ]}
              onPress={() =>
                setSortDirection("asc")
              }
            >
              <Ionicons
                name="arrow-up"
                size={14}
                color={
                  sortDirection === "asc"
                    ? colors.white
                    : colors.navy
                }
              />

              <Text
                style={[
                  styles.sortBtnText,
                  sortDirection === "asc" &&
                    styles.sortBtnTextActive,
                ]}
              >
                Asc
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.sortBtn,
                sortDirection === "desc" &&
                  styles.sortBtnActive,
              ]}
              onPress={() =>
                setSortDirection("desc")
              }
            >
              <Ionicons
                name="arrow-down"
                size={14}
                color={
                  sortDirection === "desc"
                    ? colors.white
                    : colors.navy
                }
              />

              <Text
                style={[
                  styles.sortBtnText,
                  sortDirection === "desc" &&
                    styles.sortBtnTextActive,
                ]}
              >
                Desc
              </Text>
            </Pressable>
          </View>
        </View>

        {/* LIST HEADER */}
        <View style={styles.listHeader}>
          <View style={styles.listHeaderLeft}>
            <View style={styles.listHeaderAccent} />

            <Text style={styles.listTitle}>
              Customer Accounts
            </Text>
          </View>

          <View style={styles.accountCount}>
            <Text style={styles.accountCountText}>
              {sortedDebtors.length}
            </Text>
          </View>
        </View>
      </View>

      {/* CUSTOMER LIST */}
      <FlatList
        data={sortedDebtors}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="Walang debtor"
            subtitle={
              query
                ? "No customer matches your search."
                : "Add a customer to start tracking credit and utang."
            }
          />
        }
        renderItem={({ item }) => {
          const balance = item.balance || 0;
          const hasDebt = balance > 0;

          const displayName =
            item.full_name ||
            item.name ||
            "Unknown Customer";

          const initial =
            displayName
              .trim()
              .charAt(0)
              .toUpperCase() || "D";

          // Get a unique color based on A-Z.
          const avatarColor =
            getAvatarColor(displayName);

          return (
            <Pressable
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
              ]}
              onPress={() =>
                router.push(
                  `/debtors/${item.id}`
                )
              }
            >
              {/* LEFT ACCENT */}
              <View
                style={[
                  styles.rowAccent,
                  {
                    backgroundColor: avatarColor,
                  },
                ]}
              />

              {/* AVATAR */}
              <View
                style={[
                  styles.avatarOuter,
                  {
                    backgroundColor: `${avatarColor}18`,
                    borderColor: `${avatarColor}35`,
                  },
                ]}
              >
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor:
                        avatarColor,
                    },
                  ]}
                >
                  <Text style={styles.avatarText}>
                    {initial}
                  </Text>
                </View>
              </View>

              {/* CUSTOMER INFO */}
              <View style={styles.detailsCol}>
                <Text
                  style={styles.name}
                  numberOfLines={1}
                >
                  {displayName}
                </Text>

                <View style={styles.contactRow}>
                  <View style={styles.phoneIcon}>
                    <Ionicons
                      name="call-outline"
                      size={10}
                      color={avatarColor}
                    />
                  </View>

                  <Text
                    style={styles.contact}
                    numberOfLines={1}
                  >
                    {item.contact_number ||
                      "No contact number"}
                  </Text>
                </View>
              </View>

              {/* BALANCE */}
              <View style={styles.balanceCol}>
                <Text
                  style={[
                    styles.balance,
                    {
                      color: hasDebt
                        ? colors.danger
                        : colors.success,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {hasDebt
                    ? formatCurrency(balance)
                    : "Settled"}
                </Text>

                <View
                  style={[
                    styles.statusBadge,
                    hasDebt
                      ? styles.statusBadgeDebt
                      : styles.statusBadgeSettled,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          hasDebt
                            ? colors.danger
                            : colors.success,
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.balanceLabel,
                      {
                        color: hasDebt
                          ? colors.danger
                          : colors.success,
                      },
                    ]}
                  >
                    {hasDebt
                      ? "OWES"
                      : "SETTLED"}
                  </Text>
                </View>
              </View>

              {/* ARROW */}
              <View
                style={[
                  styles.arrowWrap,
                  {
                    borderColor: `${avatarColor}20`,
                    backgroundColor: `${avatarColor}0D`,
                  },
                ]}
              >
                <Ionicons
                  name="chevron-forward"
                  size={15}
                  color={avatarColor}
                />
              </View>
            </Pressable>
          );
        }}
      />

      {/* ADD BUTTON */}
      <Pressable
        style={({ pressed }) => [
          styles.floatingAddBtn,
          pressed && styles.floatingAddPressed,
        ]}
        onPress={() =>
          router.push("/debtors/new")
        }
        hitSlop={8}
      >
        <View style={styles.addInner}>
          <Ionicons
            name="add"
            size={29}
            color={colors.white}
          />
        </View>
      </Pressable>

      <BottomNav activeTab="debtors" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },

  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },

  /* =========================
     TOTAL CARD
  ========================= */

  totalBanner: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.navy,
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.sm,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#294665",

    shadowColor: colors.navy,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 5,
  },

  totalGlowOne: {
    position: "absolute",
    right: -40,
    top: -50,
    width: 135,
    height: 135,
    borderRadius: 70,
    backgroundColor: "#D9A92812",
  },

  totalGlowTwo: {
    position: "absolute",
    left: -55,
    bottom: -75,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#3B82F610",
  },

  totalIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: "#D9A92818",
    borderWidth: 1,
    borderColor: "#D9A92835",
    alignItems: "center",
    justifyContent: "center",
  },

  totalInfo: {
    flex: 1,
    minWidth: 0,
  },

  totalEyebrow: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.3,
    color: "#FFFFFF70",
    marginBottom: 3,
  },

  totalLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.goldLight,
    letterSpacing: 0.2,
  },

  totalSubtext: {
    fontSize: 10,
    color: "#FFFFFFA0",
    marginTop: 4,
  },

  totalAmountWrap: {
    alignItems: "flex-end",
    zIndex: 2,
  },

  totalAmountLabel: {
    fontSize: 8,
    fontWeight: "900",
    color: "#FFFFFF70",
    letterSpacing: 1,
    marginBottom: 2,
  },

  totalAmount: {
    fontSize: 19,
    fontWeight: "900",
    color: colors.white,
    letterSpacing: -0.3,
  },

  /* =========================
     SEARCH
  ========================= */

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    minHeight: 52,
    paddingHorizontal: 7,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,

    shadowColor: "#000",
    shadowOpacity: 0.035,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 1,
  },

  searchIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#142C4A0D",
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingHorizontal: spacing.sm,
    paddingVertical: 0,
  },

  clearSearch: {
    padding: 7,
  },

  /* =========================
     SORT
  ========================= */

  sortCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    padding: spacing.sm,
    paddingLeft: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,

    shadowColor: "#000",
    shadowOpacity: 0.025,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 1,
  },

  sortInfo: {
    flex: 1,
  },

  sortTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  sortIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#142C4A0D",
    borderWidth: 1,
    borderColor: "#142C4A10",
  },

  sortLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.text,
  },

  sortHint: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 3,
  },

  sortControls: {
    flexDirection: "row",
    gap: 5,
  },

  sortBtn: {
    minWidth: 61,
    height: 35,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  sortBtnActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,

    shadowColor: colors.navy,
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  sortBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.navy,
  },

  sortBtnTextActive: {
    color: colors.white,
  },

  /* =========================
     LIST HEADER
  ========================= */

  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
    paddingBottom: 2,
  },

  listHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  listHeaderAccent: {
    width: 4,
    height: 17,
    borderRadius: 3,
    backgroundColor: colors.goldLight,
  },

  listTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.navy,
    letterSpacing: 0.2,
  },

  accountCount: {
    minWidth: 27,
    height: 25,
    paddingHorizontal: 7,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#142C4A0C",
    borderWidth: 1,
    borderColor: "#142C4A15",
  },

  accountCountText: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.navy,
  },

  /* =========================
     LIST
  ========================= */

  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom:
      bottomNavHeight + 105,
    flexGrow: 1,
  },

  /* =========================
     CUSTOMER ROW
  ========================= */

  row: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm + 3,
    marginBottom: spacing.sm,
    overflow: "hidden",

    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  rowPressed: {
    opacity: 0.8,
    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  rowAccent: {
    position: "absolute",
    left: 0,
    top: 10,
    bottom: 10,
    width: 4,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
  },

  /* =========================
     A-Z AVATAR
  ========================= */

  avatarOuter: {
    width: 50,
    height: 50,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  avatar: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  avatarText: {
    color: colors.white,
    fontWeight: "900",
    fontSize: 16,
  },

  /* =========================
     CUSTOMER INFO
  ========================= */

  detailsCol: {
    flex: 1,
    minWidth: 0,
  },

  name: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.1,
  },

  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
  },

  phoneIcon: {
    width: 20,
    height: 20,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#142C4A08",
  },

  contact: {
    fontSize: 11,
    color: colors.textMuted,
    flex: 1,
  },

  /* =========================
     BALANCE
  ========================= */

  balanceCol: {
    alignItems: "flex-end",
    maxWidth: 105,
  },

  balance: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.2,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
  },

  statusBadgeDebt: {
    backgroundColor: "#B3413B10",
  },

  statusBadgeSettled: {
    backgroundColor: "#2E7D5B10",
  },

  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  balanceLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  /* =========================
     ARROW
  ========================= */

  arrowWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  /* =========================
     FLOATING ADD BUTTON
  ========================= */

  floatingAddBtn: {
    position: "absolute",
    right: spacing.md,
    bottom:
      bottomNavHeight + spacing.md,
    width: 62,
    height: 62,
    borderRadius: 21,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",

    shadowColor: colors.navy,
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 10,
  },

  addInner: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF12",
    borderWidth: 1,
    borderColor: "#FFFFFF18",
  },

  floatingAddPressed: {
    opacity: 0.8,
    transform: [
      {
        scale: 0.93,
      },
    ],
  },
});
