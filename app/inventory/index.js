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
import {
  colors,
  spacing,
  radius,
} from "@/constants/theme";
import { formatCurrency } from "@/lib/format";
import { formatProductUnit } from "@/constants/productUnits";
import { getProducts } from "@/db/database";
import { useAuth } from "@/context/AuthContext";

export default function InventoryScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { user } = useAuth();

  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("all");

  const load = useCallback(
    async (q) => {
      const rows = await getProducts(
        db, user?.id,
        q.trim() || undefined
      );
      setProducts(rows);
    },
    [db, user?.id]
  );

  useFocusEffect(
    useCallback(() => {
      load(query);
    }, [load, query])
  );

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const stock =
        Number(product.stock_quantity) || 0;

      const threshold =
        Number(product.low_stock_threshold) || 0;

      if (stockFilter === "available") {
        return stock > threshold;
      }

      if (stockFilter === "low") {
        return stock > 0 && stock <= threshold;
      }

      if (stockFilter === "out") {
        return stock <= 0;
      }

      return true;
    });
  }, [products, stockFilter]);

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top"]}
    >
      {/* HEADER */}
      <TopHeader
        title="Inventory"
        subtitle={`${filteredProducts.length} product${
          filteredProducts.length === 1 ? "" : "s"
        } shown`}
      />

      {/* CONTROLS */}
      <View style={styles.controls}>

        {/* SEARCH BAR */}
        <View style={styles.searchSection}>
          <Text style={styles.searchTitle}>
            Find a product
          </Text>

          <View style={styles.searchWrap}>
            <View style={styles.searchIconBox}>
              <Ionicons
                name="search-outline"
                size={18}
                color={colors.navy}
              />
            </View>

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
                style={styles.clearButton}
              >
                <Ionicons
                  name="close-circle"
                  size={19}
                  color={colors.textMuted}
                />
              </Pressable>
            )}
          </View>
        </View>

        {/* FILTER HEADER */}
        <View style={styles.filterHeader}>
          <View>
            <Text style={styles.filterTitle}>
              Stock status
            </Text>

            <Text style={styles.filterSubtitle}>
              Filter your products
            </Text>
          </View>

          <View style={styles.inventoryIcon}>
            <Ionicons
              name="layers-outline"
              size={18}
              color={colors.navy}
            />
          </View>
        </View>

        {/* FILTERS */}
        <View style={styles.filterWrap}>
          <FilterChip
            icon="apps-outline"
            label="All"
            active={stockFilter === "all"}
            onPress={() =>
              setStockFilter("all")
            }
          />

          <FilterChip
            icon="checkmark-circle-outline"
            label="Available"
            active={
              stockFilter === "available"
            }
            onPress={() =>
              setStockFilter("available")
            }
          />

          <FilterChip
            icon="warning-outline"
            label="Low"
            active={stockFilter === "low"}
            onPress={() =>
              setStockFilter("low")
            }
          />

          <FilterChip
            icon="close-circle-outline"
            label="Out"
            active={stockFilter === "out"}
            onPress={() =>
              setStockFilter("out")
            }
          />
        </View>
      </View>

      {/* PRODUCT LIST */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) =>
          String(item.id)
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.listContent
        }
        numColumns={1}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="cube-outline"
              title={
                products.length === 0
                  ? "No products yet"
                  : "No matching products"
              }
              subtitle={
                products.length === 0
                  ? "Catalog your stock to sell faster at the counter."
                  : "Try another search or stock filter."
              }
            />
          </View>
        }
        renderItem={({ item }) => {
          const stock =
            Number(item.stock_quantity) || 0;

          const threshold =
            Number(item.low_stock_threshold) ||
            0;

          const low =
            stock > 0 && stock <= threshold;

          const outOfStock = stock <= 0;

          return (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
              onPress={() =>
                router.push(
                  `/inventory/${item.id}`
                )
              }
            >
              {/* PRODUCT ICON */}
              <View
                style={[
                  styles.productIcon,
                  outOfStock &&
                    styles.productIconOut,
                  low &&
                    styles.productIconLow,
                ]}
              >
                <Ionicons
                  name="cube-outline"
                  size={22}
                  color={
                    outOfStock
                      ? colors.textMuted
                      : low
                      ? colors.danger
                      : colors.navy
                  }
                />
              </View>

              {/* PRODUCT INFORMATION */}
              <View style={styles.productInfo}>
                <View
                  style={styles.productTop}
                >
                  <Text
                    style={styles.productName}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>

                  {low && (
                    <View
                      style={styles.lowBadge}
                    >
                      <Ionicons
                        name="warning-outline"
                        size={10}
                        color={colors.white}
                      />

                      <Text
                        style={styles.lowBadgeText}
                      >
                        LOW
                      </Text>
                    </View>
                  )}

                  {outOfStock && (
                    <View
                      style={styles.outBadge}
                    >
                      <Text
                        style={styles.outBadgeText}
                      >
                        OUT
                      </Text>
                    </View>
                  )}
                </View>

                {item.category ? (
                  <View
                    style={styles.categoryRow}
                  >
                    <Ionicons
                      name="pricetag-outline"
                      size={12}
                      color={colors.textMuted}
                    />

                    <Text
                      style={styles.category}
                      numberOfLines={1}
                    >
                      {item.category}
                    </Text>
                  </View>
                ) : null}

                {item.measurement_value != null ? (
                  <View style={styles.categoryRow}>
                    <Ionicons
                      name="resize-outline"
                      size={12}
                      color={colors.textMuted}
                    />

                    <Text style={styles.category}>
                      {item.measurement_value} {formatProductUnit(item.unit)}
                    </Text>
                  </View>
                ) : null}

                <View
                  style={styles.productBottom}
                >
                  <View>
                    <Text
                      style={styles.priceLabel}
                    >
                      Unit price
                    </Text>

                    <Text
                      style={styles.price}
                    >
                      {formatCurrency(
                        item.unit_price
                      )}
                    </Text>
                  </View>

                  <View
                    style={styles.stockContainer}
                  >
                    <View
                      style={[
                        styles.stockIcon,
                        low &&
                          styles.stockIconLow,
                        outOfStock &&
                          styles.stockIconOut,
                      ]}
                    >
                      <Ionicons
                        name={
                          outOfStock
                            ? "close-outline"
                            : low
                            ? "warning-outline"
                            : "cube-outline"
                        }
                        size={13}
                        color={
                          outOfStock
                            ? colors.textMuted
                            : low
                            ? colors.danger
                            : colors.navy
                        }
                      />
                    </View>

                    <View>
                      <Text
                        style={
                          styles.stockLabel
                        }
                      >
                        Stock
                      </Text>

                      <Text
                        style={[
                          styles.stock,
                          low && {
                            color:
                              colors.danger,
                          },
                          outOfStock && {
                            color:
                              colors.textMuted,
                          },
                        ]}
                      >
                        {stock} {stock === 1 ? "item" : "items"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* ARROW */}
              <View style={styles.arrowButton}>
                <Ionicons
                  name="chevron-forward"
                  size={17}
                  color={colors.navy}
                />
              </View>
            </Pressable>
          );
        }}
      />

      {/* FLOATING ADD BUTTON */}
      <Pressable
        style={({ pressed }) => [
          styles.floatingAddBtn,
          pressed && styles.floatingPressed,
        ]}
        onPress={() =>
          router.push("/inventory/new")
        }
        hitSlop={8}
      >
        <Ionicons
          name="add"
          size={29}
          color={colors.white}
        />
      </Pressable>

      <BottomNav activeTab="inventory" />
    </SafeAreaView>
  );
}

function FilterChip({
  label,
  icon,
  active,
  onPress,
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.filterChip,
        active && styles.filterChipActive,
        pressed && styles.filterChipPressed,
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={13}
        color={
          active
            ? colors.white
            : colors.navy
        }
      />

      <Text
        style={[
          styles.filterChipText,
          active &&
            styles.filterChipTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },

  /* =========================
     CONTROLS
  ========================= */

  controls: {
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    marginBottom: spacing.md,
    gap: spacing.md,
  },

  /* =========================
     SEARCH SECTION
  ========================= */

  searchSection: {
    width: "100%",
    gap: 7,
  },

  searchTitle: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 2,
  },

  searchWrap: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    paddingHorizontal: 9,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.navy,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 1,
  },

  searchIconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 0,
  },

  clearButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  /* =========================
     FILTER HEADER
  ========================= */

  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },

  filterTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "900",
  },

  filterSubtitle: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },

  inventoryIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  /* =========================
     FILTERS
  ========================= */

  filterWrap: {
    flexDirection: "row",
    gap: 6,
  },

  filterChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    gap: 4,
  },

  filterChipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },

  filterChipPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },

  filterChipText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.navy,
  },

  filterChipTextActive: {
    color: colors.white,
  },

  /* =========================
     LIST
  ========================= */

  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: 0,
    paddingBottom:
      bottomNavHeight + 105,
    flexGrow: 1,
  },

  emptyWrap: {
    flex: 1,
    minHeight: 300,
    justifyContent: "center",
  },

  /* =========================
     PRODUCT CARD
  ========================= */

  card: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    shadowColor: colors.navy,
    shadowOpacity: 0.045,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 1,
  },

  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },

  productIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  productIconLow: {
    backgroundColor:
      "rgba(217,169,40,0.12)",
  },

  productIconOut: {
    backgroundColor:
      "rgba(120,120,120,0.10)",
  },

  productInfo: {
    flex: 1,
    minWidth: 0,
  },

  productTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingRight: 2,
  },

  productName: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900",
    color: colors.text,
  },

  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },

  category: {
    flex: 1,
    fontSize: 10,
    color: colors.textMuted,
  },

  priceLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: "600",
    marginBottom: 1,
  },

  price: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.navy,
  },

  productBottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 9,
  },

  stockContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  stockIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },

  stockIconLow: {
    backgroundColor:
      "rgba(217,169,40,0.12)",
  },

  stockIconOut: {
    backgroundColor:
      "rgba(120,120,120,0.10)",
  },

  stockLabel: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: "600",
  },

  stock: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.navy,
    marginTop: 1,
  },

  /* =========================
     BADGES
  ========================= */

  lowBadge: {
    backgroundColor: colors.danger,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  lowBadgeText: {
    color: colors.white,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.4,
  },

  outBadge: {
    backgroundColor:
      "rgba(90,90,90,0.12)",
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  outBadgeText: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.4,
  },

  /* =========================
     ARROW
  ========================= */

  arrowButton: {
    width: 29,
    height: 29,
    borderRadius: 10,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  /* =========================
     FLOATING ADD
  ========================= */

  floatingAddBtn: {
    position: "absolute",
    right: spacing.md,
    bottom:
      bottomNavHeight + spacing.md,
    width: 62,
    height: 62,
    borderRadius: radius.full,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.navy,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 8,
  },

  floatingPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.94 }],
  },
});

