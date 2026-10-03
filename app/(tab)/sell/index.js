// index.js
import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import EmptyState from "@/components/EmptyState";
import TopHeader from "@/components/TopHeader";
import { colors, spacing, radius } from "@/constants/theme";
import { formatCurrency } from "@/lib/format";
import { getProducts } from "@/db/database";
import { useAuth } from "@/context/AuthContext";
import { canSellByItem, formatStockQuantity, getSalePricing } from "@/lib/inventory";

export default function SellScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState({});

  const load = useCallback(
    async (q) => {
      const rows = await getProducts(
        db,
        user?.id,
        q?.trim() || undefined
      );
      setProducts(rows);
    },
    [db, user?.id]
  );

  useFocusEffect(
    useCallback(() => {
      load(query);
      setCart({});
    }, [load, query])
  );

  function addToCart(product, saleMode = "package") {
    const currentQuantity = cart[product.id]?.quantity || 0;
    const pricing = getSalePricing(product, saleMode);

    if (
      (currentQuantity + 1) * pricing.stockItems >
      Number(product.stock_quantity)
    ) {
      Alert.alert(
        "Not enough stock",
        `${product.name} only has ${product.stock_quantity} item(s) left in stock.`
      );
      return;
    }

    setCart((current) => {
      const existing = current[product.id];
      const nextQuantity = existing?.quantity || 0;

      return {
        ...current,
        [product.id]: {
          product,
          quantity: nextQuantity + 1,
          saleMode,
        },
      };
    });
  }

  function chooseSaleMode(product) {
    const existing = cart[product.id];
    if (existing) return addToCart(product, existing.saleMode);
    if (!canSellByItem(product)) return addToCart(product);

    Alert.alert(`Add ${product.name}`, "Choose how to sell this product.", [
      { text: `Package — ${formatCurrency(product.unit_price)}`, onPress: () => addToCart(product, "package") },
      { text: `Single item — ${formatCurrency(product.item_price)}`, onPress: () => addToCart(product, "item") },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function removeFromCart(productId) {
    setCart((current) => {
      const existing = current[productId];

      if (!existing) return current;

      if (existing.quantity <= 1) {
        const next = { ...current };
        delete next[productId];
        return next;
      }

      return {
        ...current,
        [productId]: {
          ...existing,
          quantity: existing.quantity - 1,
        },
      };
    });
  }

  const cartItems = Object.values(cart);

  const cartCount = cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const cartTotal = cartItems.reduce(
    (sum, item) =>
      sum + item.quantity * getSalePricing(item.product, item.saleMode).unitPrice,
    0
  );

  function goToCheckout() {
    const compactCart = cartItems.map((item) => ({
      quantity: item.quantity,
      product: {
        id: item.product.id,
        name: item.product.name,
        unit_price: item.product.unit_price,
        stock_quantity: item.product.stock_quantity,
        unit: item.product.unit,
        measurement_value: item.product.measurement_value,
        item_price: item.product.item_price,
      },
      saleMode: item.saleMode,
    }));

    router.push({
      pathname: "/sell/checkout",
      params: {
        cart: JSON.stringify(compactCart),
      },
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TopHeader
        title="Sell"
        subtitle={`${cartCount} item${
          cartCount === 1 ? "" : "s"
        } selected`}
      />

      {/* SEARCH */}
      <View style={styles.searchWrap}>
        <View style={styles.searchIcon}>
          <Ionicons
            name="search-outline"
            size={18}
            color={colors.navy}
          />
        </View>

        <TextInput
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            load(text);
          }}
          placeholder="Search products to sell..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />

        {query.length > 0 && (
          <Pressable
            onPress={() => {
              setQuery("");
              load("");
            }}
            hitSlop={10}
          >
            <Ionicons
              name="close-circle"
              size={19}
              color={colors.textMuted}
            />
          </Pressable>
        )}
      </View>

      {/* PRODUCT LIST */}
      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          products.length > 0 ? (
            <View style={styles.listHeader}>
              <View>
                <Text style={styles.listTitle}>Products</Text>
                <Text style={styles.listSubtitle}>
                  Select an item to add it to the sale
                </Text>
              </View>

              <View style={styles.productCount}>
                <Text style={styles.productCountText}>
                  {products.length}
                </Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="cart-outline"
            title="No products to sell"
            subtitle="Add products to inventory first."
          />
        }
        renderItem={({ item }) => {
          const inCart = cart[item.id]?.quantity || 0;
          const outOfStock = item.stock_quantity <= 0;
          const saleMode = cart[item.id]?.saleMode || "package";
          const stockItems = getSalePricing(item, saleMode).stockItems;
          const atMaxStock =
            inCart * stockItems >= item.stock_quantity;

          return (
            <View
              style={[
                styles.row,
                inCart > 0 && styles.rowSelected,
              ]}
            >
              {/* PRODUCT ICON */}
              <View
                style={[
                  styles.productIcon,
                  outOfStock && styles.productIconDisabled,
                  inCart > 0 && styles.productIconSelected,
                ]}
              >
                <Ionicons
                  name="cube-outline"
                  size={21}
                  color={
                    outOfStock
                      ? colors.textMuted
                      : inCart > 0
                      ? colors.gold
                      : colors.navy
                  }
                />
              </View>

              {/* PRODUCT INFO */}
              <View style={styles.productCol}>
                <Text
                  style={[
                    styles.productName,
                    outOfStock && styles.productNameDisabled,
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>

                <View style={styles.productDetails}>
                  <Text style={styles.productPrice}>
                    {formatCurrency(
                      getSalePricing(item, "item").unitPrice
                    )}
                  </Text>

                  <View style={styles.dot} />

                  <View
                    style={[
                      styles.stockBadge,
                      outOfStock
                        ? styles.stockBadgeEmpty
                        : item.stock_quantity <= 5
                        ? styles.stockBadgeLow
                        : styles.stockBadgeGood,
                    ]}
                  >
                    <View
                      style={[
                        styles.stockDot,
                        outOfStock
                          ? styles.stockDotEmpty
                          : item.stock_quantity <= 5
                          ? styles.stockDotLow
                          : styles.stockDotGood,
                      ]}
                    />

                    <Text
                      style={[
                        styles.stockText,
                        outOfStock
                          ? styles.stockTextEmpty
                          : item.stock_quantity <= 5
                          ? styles.stockTextLow
                          : styles.stockTextGood,
                      ]}
                    >
                      {outOfStock
                        ? "No stock"
                        : `${formatStockQuantity(item.stock_quantity, item.unit)} in stock`}
                    </Text>
                  </View>
                </View>
              </View>

              {/* ACTION */}
              {inCart > 0 ? (
                <View style={styles.qtyControl}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.qtyButton,
                      pressed && styles.qtyButtonPressed,
                    ]}
                    onPress={() =>
                      removeFromCart(item.id)
                    }
                  >
                    <Ionicons
                      name="remove"
                      size={18}
                      color={colors.navy}
                    />
                  </Pressable>

                  <View style={styles.qtyNumberBox}>
                    <Text style={styles.qtyText}>
                      {inCart}
                    </Text>
                  </View>

                  <Pressable
                    style={[
                      styles.qtyButton,
                      atMaxStock &&
                        styles.qtyButtonDisabled,
                    ]}
                    onPress={() => chooseSaleMode(item)}
                    disabled={atMaxStock}
                  >
                    <Ionicons
                      name="add"
                      size={18}
                      color={
                        atMaxStock
                          ? colors.textMuted
                          : colors.navy
                      }
                    />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.addButton,
                    outOfStock &&
                      styles.addButtonDisabled,
                    pressed &&
                      !outOfStock &&
                      styles.addButtonPressed,
                  ]}
                  onPress={() => chooseSaleMode(item)}
                  disabled={outOfStock}
                >
                  <Ionicons
                    name={
                      outOfStock
                        ? "close-circle-outline"
                        : "add"
                    }
                    size={16}
                    color={colors.white}
                  />

                  <Text style={styles.addButtonText}>
                    {outOfStock ? "No stock" : "Add"}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />

      {/* CART BAR */}
      {cartCount > 0 && (
        <Pressable
          style={({ pressed }) => [
            styles.cartBar,
            pressed && styles.cartBarPressed,
          ]}
          onPress={goToCheckout}
        >
          <View style={styles.cartLeft}>
            <View style={styles.cartIcon}>
              <Ionicons
                name="cart"
                size={20}
                color={colors.navy}
              />
            </View>

            <View>
              <Text style={styles.cartText}>
                {cartCount} item
                {cartCount === 1 ? "" : "s"}
              </Text>

              <Text style={styles.cartSubtext}>
                View checkout
              </Text>
            </View>
          </View>

          <View style={styles.cartRight}>
            <Text style={styles.cartTotal}>
              {formatCurrency(cartTotal)}
            </Text>

            <View style={styles.cartArrow}>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.white}
              />
            </View>
          </View>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },

  /* SEARCH */
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 52,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  searchIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 8,
  },

  /* LIST */
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 100,
    flexGrow: 1,
  },

  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },

  listTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: colors.navy,
  },

  listSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
  },

  productCount: {
    minWidth: 32,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },

  productCountText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "900",
  },

  /* PRODUCT ROW */
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: spacing.sm,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.035,
    shadowRadius: 6,
    elevation: 1,
  },

  rowSelected: {
    borderColor: colors.gold,
    backgroundColor: "#FFFDF7",
  },

  productIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },

  productIconSelected: {
    backgroundColor: colors.navy,
  },

  productIconDisabled: {
    backgroundColor: "#EEEEEE",
  },

  productCol: {
    flex: 1,
    minWidth: 0,
  },

  productName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },

  productNameDisabled: {
    color: colors.textMuted,
  },

  productDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  productPrice: {
    fontSize: 12,
    color: colors.navy,
    fontWeight: "800",
  },

  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    marginHorizontal: 7,
  },

  /* STOCK BADGE */
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
  },

  stockBadgeGood: {
    backgroundColor: "rgba(46, 125, 50, 0.09)",
  },

  stockBadgeLow: {
    backgroundColor: "rgba(217, 169, 40, 0.13)",
  },

  stockBadgeEmpty: {
    backgroundColor: "rgba(100, 100, 100, 0.08)",
  },

  stockDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 4,
  },

  stockDotGood: {
    backgroundColor: "#2E7D32",
  },

  stockDotLow: {
    backgroundColor: colors.gold,
  },

  stockDotEmpty: {
    backgroundColor: colors.textMuted,
  },

  stockText: {
    fontSize: 9,
    fontWeight: "700",
  },

  stockTextGood: {
    color: "#2E7D32",
  },

  stockTextLow: {
    color: colors.navy,
  },

  stockTextEmpty: {
    color: colors.textMuted,
  },

  /* ADD BUTTON */
  addButton: {
    minWidth: 72,
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: radius.full,
    backgroundColor: colors.navy,
    paddingHorizontal: 13,
  },

  addButtonDisabled: {
    backgroundColor: colors.textMuted,
  },

  addButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },

  addButtonText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 11,
  },

  /* QUANTITY */
qtyControl: {
  width: 86,
  height: 38,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: colors.cream,
  borderRadius: radius.full,
  paddingHorizontal: 3,
  borderWidth: 1,
  borderColor: colors.border,
  flexShrink: 0,
},

qtyButton: {
  width: 30,
  height: 30,
  borderRadius: 15,
  backgroundColor: colors.white,
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
},

qtyButtonPressed: {
  backgroundColor: "#F1EFE7",
  transform: [{ scale: 0.92 }],
},

qtyButtonDisabled: {
  opacity: 0.4,
},

qtyNumberBox: {
  width: 20,
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
},

qtyText: {
  fontSize: 14,
  fontWeight: "900",
  color: colors.navy,
},

  /* CART BAR */
  cartBar: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.sm,
    minHeight: 66,
    borderRadius: radius.md,
    backgroundColor: colors.navy,
    paddingLeft: 9,
    paddingRight: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 9,
  },

  cartBarPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.95,
  },

  cartLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  cartIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: colors.goldLight,
    alignItems: "center",
    justifyContent: "center",
  },

  cartText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "900",
  },

  cartSubtext: {
    color: colors.goldLight,
    fontSize: 10,
    marginTop: 2,
    fontWeight: "600",
  },

  cartRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  cartTotal: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "900",
  },

  cartArrow: {
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
});

