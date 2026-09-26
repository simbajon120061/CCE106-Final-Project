import { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import EmptyState from "@/components/EmptyState";
import BottomNav, { bottomNavHeight } from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { colors, spacing, radius } from "@/constants/theme";
import { formatCurrency } from "@/lib/format";
import { getProducts } from "@/db/database";

export default function SellScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState({});

  const load = useCallback(
    async (q) => {
      const rows = await getProducts(db, q?.trim() || undefined);
      setProducts(rows);
    },
    [db]
  );

  useFocusEffect(
    useCallback(() => {
      load(query);
      setCart({});
    }, [load, query])
  );

  function addToCart(product) {
    setCart((current) => {
      const existing = current[product.id];
      const currentQuantity = existing?.quantity || 0;
      if (currentQuantity + 1 > product.stock_quantity) return current;
      return {
        ...current,
        [product.id]: { product, quantity: currentQuantity + 1 },
      };
    });
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
        [productId]: { ...existing, quantity: existing.quantity - 1 },
      };
    });
  }

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.quantity * item.product.unit_price,
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
      },
    }));
    router.push({
      pathname: "/sell/checkout",
      params: { cart: JSON.stringify(compactCart) },
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <TopHeader title="Sell" subtitle={`${cartCount} item${cartCount === 1 ? "" : "s"} selected`} />

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
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
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
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
          const atMaxStock = inCart >= item.stock_quantity;

          return (
            <View style={styles.row}>
              <View style={styles.productCol}>
                <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.productMeta}>
                  {formatCurrency(item.unit_price)} - Stock: {item.stock_quantity}
                </Text>
              </View>

              {inCart > 0 ? (
                <View style={styles.qtyControl}>
                  <Pressable style={styles.qtyButton} onPress={() => removeFromCart(item.id)}>
                    <Ionicons name="remove" size={18} color={colors.navy} />
                  </Pressable>
                  <Text style={styles.qtyText}>{inCart}</Text>
                  <Pressable
                    style={[styles.qtyButton, atMaxStock && styles.qtyButtonDisabled]}
                    onPress={() => addToCart(item)}
                    disabled={atMaxStock}
                  >
                    <Ionicons name="add" size={18} color={atMaxStock ? colors.textMuted : colors.navy} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={[styles.addButton, outOfStock && styles.addButtonDisabled]}
                  onPress={() => addToCart(item)}
                  disabled={outOfStock}
                >
                  <Text style={styles.addButtonText}>{outOfStock ? "No stock" : "Add"}</Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />

      {cartCount > 0 && (
        <Pressable style={styles.cartBar} onPress={goToCheckout}>
          <Text style={styles.cartText}>{cartCount} item{cartCount === 1 ? "" : "s"}</Text>
          <Text style={styles.cartTotal}>{formatCurrency(cartTotal)}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.white} />
        </Pressable>
      )}

      <BottomNav activeTab="sell" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.white,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: bottomNavHeight + 100, flexGrow: 1 },
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
  productCol: { flex: 1, minWidth: 0 },
  productName: { fontSize: 15, fontWeight: "800", color: colors.text },
  productMeta: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  addButton: {
    minWidth: 76,
    alignItems: "center",
    borderRadius: radius.full,
    backgroundColor: colors.navy,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  addButtonDisabled: { backgroundColor: colors.textMuted },
  addButtonText: { color: colors.white, fontWeight: "800", fontSize: 12 },
  qtyControl: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  qtyButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyButtonDisabled: { opacity: 0.45 },
  qtyText: { minWidth: 22, textAlign: "center", fontSize: 16, fontWeight: "900", color: colors.text },
  cartBar: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: bottomNavHeight + spacing.sm,
    minHeight: 58,
    borderRadius: radius.sm,
    backgroundColor: colors.navy,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 7,
  },
  cartText: { color: colors.white, fontSize: 14, fontWeight: "800" },
  cartTotal: { color: colors.white, fontSize: 17, fontWeight: "900" },
});
