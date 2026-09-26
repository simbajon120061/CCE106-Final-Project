import { View, Text, StyleSheet, FlatList, Pressable, TextInput } from "react-native";
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
import { getProducts } from "@/db/database";

export default function InventoryScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("all");

  const load = useCallback(
    async (q) => {
      const rows = await getProducts(db, q.trim() || undefined);
      setProducts(rows);
    },
    [db]
  );

  useFocusEffect(
    useCallback(() => {
      load(query);
    }, [load, query])
  );

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const stock = Number(product.stock_quantity) || 0;
      const threshold = Number(product.low_stock_threshold) || 0;
      if (stockFilter === "available") return stock > threshold;
      if (stockFilter === "low") return stock > 0 && stock <= threshold;
      if (stockFilter === "out") return stock <= 0;
      return true;
    });
  }, [products, stockFilter]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TopHeader
        title="Inventory"
        subtitle={`${filteredProducts.length} product${filteredProducts.length === 1 ? "" : "s"} shown`}
      />

      <View style={styles.controls}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              load(t);
            }}
            placeholder="Search products"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
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

        <View style={styles.filterWrap}>
          <FilterChip label="All" active={stockFilter === "all"} onPress={() => setStockFilter("all")} />
          <FilterChip
            label="Available"
            active={stockFilter === "available"}
            onPress={() => setStockFilter("available")}
          />
          <FilterChip label="Low" active={stockFilter === "low"} onPress={() => setStockFilter("low")} />
          <FilterChip label="Out" active={stockFilter === "out"} onPress={() => setStockFilter("out")} />
        </View>
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        numColumns={1}
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            title={products.length === 0 ? "No products yet" : "No matching products"}
            subtitle={
              products.length === 0
                ? "Catalog your stock to sell faster at the counter."
                : "Try another search or stock filter."
            }
          />
        }
        renderItem={({ item }) => {
          const low = item.stock_quantity <= item.low_stock_threshold;
          return (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/inventory/${item.id}`)}
            >
              {low && (
                <View style={styles.lowBadge}>
                  <Text style={styles.lowBadgeText}>LOW</Text>
                </View>
              )}
              <Text style={styles.productName} numberOfLines={2}>
                {item.name}
              </Text>
              {item.category ? <Text style={styles.category}>{item.category}</Text> : null}
              <Text style={styles.price}>{formatCurrency(item.unit_price)}</Text>
              <Text style={[styles.stock, low && { color: colors.danger }]}>
                {item.stock_quantity} in stock
              </Text>
            </Pressable>
          );
        }}
      />
      <Pressable
        style={styles.floatingAddBtn}
        onPress={() => router.push("/inventory/new")}
        hitSlop={8}
      >
        <Ionicons name="add" size={30} color={colors.white} />
      </Pressable>
      <BottomNav activeTab="inventory" />
    </SafeAreaView>
  );
}

function FilterChip({ label, active, onPress }) {
  return (
    <Pressable style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  controls: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
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
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  filterWrap: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  filterChip: {
    flex: 1,
    minHeight: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.navy,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
    paddingBottom: bottomNavHeight + 96,
    flexGrow: 1,
  },
  card: {
    flex: 1, // Note: remove flex: 1 if placed inside a ScrollView, use width: '100%' instead
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm, // Increase gap slightly for row items

    // Added for List Structure
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lowBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.danger,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  lowBadgeText: { color: colors.white, fontSize: 10, fontWeight: "800" },
  productName: { fontSize: 14, fontWeight: "700", color: colors.text, paddingRight: 30 },
  category: { fontSize: 11, color: colors.textMuted },
  price: { fontSize: 16, fontWeight: "800", color: colors.navy, marginTop: 4 },
  stock: { fontSize: 12, color: colors.textMuted },
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
