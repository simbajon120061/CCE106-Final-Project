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

export default function DebtorsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [debtors, setDebtors] = useState([]);
  const [query, setQuery] = useState("");
  const [sortDirection, setSortDirection] = useState("desc");

  const load = useCallback(
    async (q) => {
      try {
        const rows = await getDebtors(db, q?.trim() || undefined);
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
    () => debtors.reduce((sum, debtor) => sum + Math.max(debtor.balance || 0, 0), 0),
    [debtors]
  );

  const activeDebtorsCount = useMemo(
    () => debtors.filter((debtor) => (debtor.balance || 0) > 0).length,
    [debtors]
  );

  const sortedDebtors = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1;
    return [...debtors].sort((a, b) => {
      const balanceDiff = ((a.balance || 0) - (b.balance || 0)) * direction;
      if (balanceDiff !== 0) return balanceDiff;
      return (a.full_name || "").localeCompare(b.full_name || "");
    });
  }, [debtors, sortDirection]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TopHeader
        title="Debtors"
        subtitle={`${activeDebtorsCount} active credit ${
          activeDebtorsCount === 1 ? "account" : "accounts"
        }`}
      />

      <View style={styles.content}>
        <View style={styles.totalBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.totalLabel}>Total Outstanding Utang</Text>
            <Text style={styles.totalSubtext}>
              {activeDebtorsCount} active credit {activeDebtorsCount === 1 ? "account" : "accounts"}
            </Text>
          </View>
          <Text style={styles.totalAmount}>{formatCurrency(totalOwed)}</Text>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
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
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <View style={styles.sortCard}>
          <View>
            <Text style={styles.sortLabel}>Sort by balance</Text>
            <Text style={styles.sortHint}>
              {sortDirection === "desc" ? "Highest utang first" : "Lowest utang first"}
            </Text>
          </View>
          <View style={styles.sortControls}>
            <Pressable
              style={[styles.sortBtn, sortDirection === "asc" && styles.sortBtnActive]}
              onPress={() => setSortDirection("asc")}
            >
              <Ionicons
                name="arrow-up"
                size={16}
                color={sortDirection === "asc" ? colors.white : colors.navy}
              />
              <Text style={[styles.sortBtnText, sortDirection === "asc" && styles.sortBtnTextActive]}>
                Asc
              </Text>
            </Pressable>
            <Pressable
              style={[styles.sortBtn, sortDirection === "desc" && styles.sortBtnActive]}
              onPress={() => setSortDirection("desc")}
            >
              <Ionicons
                name="arrow-down"
                size={16}
                color={sortDirection === "desc" ? colors.white : colors.navy}
              />
              <Text style={[styles.sortBtnText, sortDirection === "desc" && styles.sortBtnTextActive]}>
                Desc
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <FlatList
        data={sortedDebtors}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
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
          const displayName = item.full_name || item.name || "Unknown Customer";
          const initial = displayName.trim().charAt(0).toUpperCase() || "D";

          return (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/debtors/${item.id}`)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>

              <View style={styles.detailsCol}>
                <Text style={styles.name} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={styles.contact} numberOfLines={1}>
                  {item.contact_number || "No contact number"}
                </Text>
              </View>

              <View style={styles.balanceCol}>
                <Text
                  style={[
                    styles.balance,
                    { color: hasDebt ? colors.danger : colors.success },
                  ]}
                  numberOfLines={1}
                >
                  {hasDebt ? formatCurrency(balance) : "Settled"}
                </Text>
                <Text style={styles.balanceLabel}>
                  {hasDebt ? "owes balance" : "no utang"}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />

      <Pressable
        style={styles.floatingAddBtn}
        onPress={() => router.push("/debtors/new")}
        hitSlop={8}
      >
        <Ionicons name="add" size={30} color={colors.white} />
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
    padding: spacing.md,
    gap: spacing.md,
  },
  totalBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  totalSubtext: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.danger,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  sortCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
  },
  sortHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  sortControls: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  sortBtn: {
    minWidth: 72,
    minHeight: 36,
    borderRadius: radius.sm,
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
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.navy,
  },
  sortBtnTextActive: {
    color: colors.white,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: 0,
    paddingBottom: bottomNavHeight + 96,
    flexGrow: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
  detailsCol: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  contact: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  balanceCol: {
    alignItems: "flex-end",
    maxWidth: 112,
  },
  balance: {
    fontSize: 14,
    fontWeight: "800",
  },
  balanceLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  floatingAddBtn: {
    position: "absolute",
    right: spacing.md,
    bottom: bottomNavHeight + spacing.md,
    width: 58,
    height: 58,
    borderRadius: radius.full,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.navyDark,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
