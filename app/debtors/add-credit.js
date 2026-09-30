// app/debtors/add-credit.js
import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";

import Button from "@/components/Button";
import BottomNav, { bottomNavHeight } from "@/components/BottomNav";
import { colors, spacing, typography, radius } from "@/constants/theme";
import { formatCurrency } from "@/lib/format";
import {
  addCreditTransaction,
  createSale,
  getDebtor,
  getProducts,
} from "@/db/database";
import { useAuth } from "@/context/AuthContext";
import { canSellByItem, formatStockQuantity, getSalePricing } from "@/lib/inventory";

export default function AddCreditScreen() {
  const { debtorId } = useLocalSearchParams();
  const db = useSQLiteContext();
  const router = useRouter();
  const { user } = useAuth();

  const [debtor, setDebtor] = useState(null);
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState({});
  const [manualAmount, setManualAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    let active = true;

    Promise.all([
      getProducts(db, user?.id),
      getDebtor(db, user?.id, Number(debtorId)),
    ]).then(([productRows, debtorRecord]) => {
      if (!active) return;

      setProducts(productRows);
      setDebtor(debtorRecord);
    });

    return () => {
      active = false;
    };
  }, [db, debtorId, user?.id]);

  /* ------------------------------ CART ------------------------------ */

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
      const nextQuantity = current[product.id]?.quantity || 0;

      return {
        ...current,
        [product.id]: { product, quantity: nextQuantity + 1, saleMode },
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
        [productId]: { ...existing, quantity: existing.quantity - 1 },
      };
    });
  }

  const cartItems = Object.values(cart);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.quantity * getSalePricing(item.product, item.saleMode).unitPrice,
    0
  );

  const hasProducts = cartItems.length > 0;

  // With products selected, the amount is calculated from the cart.
  // With no products, the user types the amount manually.
  const amountValue = hasProducts ? cartTotal.toFixed(2) : manualAmount;
  const amountNumber = hasProducts ? cartTotal : Number(manualAmount) || 0;

  /* ------------------------------ SAVE ------------------------------ */

  async function handleSave() {
    if (!hasProducts && amountNumber <= 0) {
      Alert.alert(
        "Invalid amount",
        "Select products or enter an amount greater than zero."
      );
      return;
    }

    setSaving(true);

    try {
      if (hasProducts) {
        await createSale(db, user?.id, {
          saleType: "credit",
          debtorId: Number(debtorId),
          items: cartItems,
          description: description.trim() || null,
        });
      } else {
        await addCreditTransaction(db, user?.id, {
          debtorId: Number(debtorId),
          amount: amountNumber,
          description: description.trim() || null,
          productId: null,
          quantity: null,
        });
      }

      router.back();
    } catch (error) {
      Alert.alert(
        "Could not save credit sale",
        error.message || "Please check stock and try again."
      );
    } finally {
      setSaving(false);
    }
  }

  /* --------------------------- PRODUCT ROW --------------------------- */

  function renderProduct(item) {
    const inCart = cart[item.id]?.quantity || 0;
    const outOfStock = item.stock_quantity <= 0;
    const saleMode = cart[item.id]?.saleMode || "package";
    const stockItems = getSalePricing(item, saleMode).stockItems;
    const atMaxStock = inCart * stockItems >= item.stock_quantity;
    const lowStock = item.stock_quantity <= 5;

    return (
      <View
        key={item.id}
        style={[styles.row, inCart > 0 && styles.rowSelected]}
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
              {formatCurrency(item.unit_price)}
            </Text>

            <View style={styles.dot} />

            <View
              style={[
                styles.stockBadge,
                outOfStock
                  ? styles.stockBadgeEmpty
                  : lowStock
                  ? styles.stockBadgeLow
                  : styles.stockBadgeGood,
              ]}
            >
              <View
                style={[
                  styles.stockDot,
                  outOfStock
                    ? styles.stockDotEmpty
                    : lowStock
                    ? styles.stockDotLow
                    : styles.stockDotGood,
                ]}
              />

              <Text
                style={[
                  styles.stockText,
                  outOfStock
                    ? styles.stockTextEmpty
                    : lowStock
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
              onPress={() => removeFromCart(item.id)}
            >
              <Ionicons name="remove" size={18} color={colors.navy} />
            </Pressable>

            <View style={styles.qtyNumberBox}>
              <Text style={styles.qtyText}>{inCart}</Text>
            </View>

            <Pressable
              style={[styles.qtyButton, atMaxStock && styles.qtyButtonDisabled]}
              onPress={() => chooseSaleMode(item)}
              disabled={atMaxStock}
            >
              <Ionicons
                name="add"
                size={18}
                color={atMaxStock ? colors.textMuted : colors.navy}
              />
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              outOfStock && styles.addButtonDisabled,
              pressed && !outOfStock && styles.addButtonPressed,
            ]}
            onPress={() => chooseSaleMode(item)}
            disabled={outOfStock}
          >
            <Ionicons
              name={outOfStock ? "close-circle-outline" : "add"}
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
  }

  /* ------------------------------- UI ------------------------------- */

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="arrow-back" size={21} color={colors.navy} />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerEyebrow} numberOfLines={1}>
            {debtor ? debtor.full_name.toUpperCase() : "DEBTOR ACCOUNT"}
          </Text>
          <Text style={styles.title}>Log credit sale</Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.form}
      >
        {/* HERO CARD */}
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="receipt-outline"
              size={25}
              color={colors.goldLight}
            />
          </View>

          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>New credit sale</Text>

            <Text style={styles.heroSubtitle}>
              Record items or an amount to add to the debtor&apos;s balance.
            </Text>
          </View>
        </View>

        {/* PRODUCTS (same UI as Sell) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="cube-outline" size={19} color={colors.navy} />
            </View>

            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Products</Text>
              <Text style={styles.sectionSubtitle}>
                Optional inventory items
              </Text>
            </View>

            <View style={styles.productCount}>
              <Text style={styles.productCountText}>
                {cartCount} selected
              </Text>
            </View>
          </View>

          {/* SEARCH */}
          <View style={styles.searchWrap}>
            <View style={styles.searchIcon}>
              <Ionicons name="search-outline" size={18} color={colors.navy} />
            </View>

            <TextInput
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                load(text);
              }}
              placeholder="Search products..."
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
          {products.length === 0 ? (
            <View style={styles.emptyProductsWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="cube-outline"
                  size={22}
                  color={colors.textMuted}
                />
              </View>

              <Text style={styles.emptyProducts}>
                {query.trim()
                  ? "No products match your search."
                  : "No inventory items yet."}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.productScroll}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {products.map(renderProduct)}
            </ScrollView>
          )}
        </View>

        {/* AMOUNT */}
        <View style={styles.amountCard}>
          <View style={styles.amountTop}>
            <View>
              <Text style={styles.amountEyebrow}>CREDIT AMOUNT</Text>

              <Text style={styles.amountLabel}>
                {hasProducts ? "Total of selected products" : "Amount to add"}
              </Text>
            </View>

            <View style={styles.amountIcon}>
              <Ionicons
                name="cash-outline"
                size={22}
                color={colors.goldLight}
              />
            </View>
          </View>

          <View style={styles.amountInputRow}>
            <Text style={styles.currencySymbol}>₱</Text>

            <TextInput
              value={amountValue}
              onChangeText={setManualAmount}
              editable={!hasProducts}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#FFFFFF66"
              style={styles.amountInput}
            />
          </View>

          <View style={styles.amountDivider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Outstanding credit</Text>

            <Text style={styles.totalValue}>
              {formatCurrency(amountNumber)}
            </Text>
          </View>
        </View>

        {/* DESCRIPTION */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="document-text-outline"
                size={19}
                color={colors.navy}
              />
            </View>

            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.sectionSubtitle}>
                Add a note about this sale
              </Text>
            </View>
          </View>

          <Text style={styles.label}>Description</Text>

          <View style={styles.descriptionWrapper}>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Rice, canned goods, load"
              placeholderTextColor={colors.textMuted}
              style={styles.descriptionInput}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* SAVE BUTTON */}
        <View style={styles.saveSection}>
          <View style={styles.saveHint}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.textMuted}
            />

            <Text style={styles.saveHintText}>
              This credit sale will be added to the debtor&apos;s outstanding
              balance.
            </Text>
          </View>

          <Button
            title="Save credit sale"
            onPress={handleSave}
            loading={saving}
          />
        </View>
      </ScrollView>

      <BottomNav activeTab="debtors" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.cream,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 12,
  },

  headerEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: colors.goldDark,
    marginBottom: 2,
  },

  title: {
    ...typography.heading,
    fontSize: 21,
    color: colors.navy,
  },

  headerSpacer: {
    width: 42,
  },

  /* FORM */
  form: {
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    paddingBottom: bottomNavHeight + spacing.xl + 20,
    gap: 14,
  },

  /* HERO */
  heroCard: {
    backgroundColor: colors.navy,
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 5,
  },

  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: "#FFFFFF14",
    borderWidth: 1,
    borderColor: "#FFFFFF20",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  heroText: {
    flex: 1,
  },

  heroTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },

  heroSubtitle: {
    color: "#FFFFFFB8",
    fontSize: 12.5,
    lineHeight: 18,
  },

  /* SECTION CARD */
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.045,
    shadowRadius: 8,
    elevation: 2,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  sectionHeaderText: {
    flex: 1,
  },

  sectionTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 2,
  },

  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 11.5,
  },

  label: {
    ...typography.label,
    color: colors.navy,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 7,
  },

  /* PRODUCTS */
  productCount: {
    minWidth: 32,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },

  productCountText: {
    color: colors.white,
    fontSize: 10.5,
    fontWeight: "900",
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAF8",
    minHeight: 50,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
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

  productScroll: {
    maxHeight: 380,
  },

  emptyProductsWrap: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  emptyProducts: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
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

  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
  },

  stockBadgeGood: { backgroundColor: "rgba(46, 125, 50, 0.09)" },
  stockBadgeLow: { backgroundColor: "rgba(217, 169, 40, 0.13)" },
  stockBadgeEmpty: { backgroundColor: "rgba(100, 100, 100, 0.08)" },

  stockDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 4,
  },

  stockDotGood: { backgroundColor: "#2E7D32" },
  stockDotLow: { backgroundColor: colors.gold },
  stockDotEmpty: { backgroundColor: colors.textMuted },

  stockText: {
    fontSize: 9,
    fontWeight: "700",
  },

  stockTextGood: { color: "#2E7D32" },
  stockTextLow: { color: colors.navy },
  stockTextEmpty: { color: colors.textMuted },

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

  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cream,
    borderRadius: radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },

  qtyButton: {
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },

  qtyButtonPressed: {
    backgroundColor: "#F1EFE7",
    transform: [{ scale: 0.92 }],
  },

  qtyButtonDisabled: {
    opacity: 0.4,
  },

  qtyNumberBox: {
    minWidth: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  qtyText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.navy,
  },

  /* AMOUNT CARD */
  amountCard: {
    backgroundColor: colors.navy,
    borderRadius: 22,
    padding: 18,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 13,
    elevation: 5,
  },

  amountTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  amountEyebrow: {
    color: colors.goldLight,
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 1.3,
    marginBottom: 4,
  },

  amountLabel: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
  },

  amountIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#FFFFFF14",
    borderWidth: 1,
    borderColor: "#FFFFFF20",
    alignItems: "center",
    justifyContent: "center",
  },

  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
  },

  currencySymbol: {
    color: colors.goldLight,
    fontSize: 30,
    fontWeight: "800",
    marginRight: 7,
  },

  amountInput: {
    flex: 1,
    color: colors.white,
    fontSize: 31,
    fontWeight: "800",
    paddingVertical: 0,
  },

  amountDivider: {
    height: 1,
    backgroundColor: "#FFFFFF18",
    marginTop: 15,
    marginBottom: 12,
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  totalLabel: {
    color: "#FFFFFF99",
    fontSize: 11.5,
  },

  totalValue: {
    color: colors.goldLight,
    fontSize: 14,
    fontWeight: "800",
  },

  /* DESCRIPTION */
  descriptionWrapper: {
    minHeight: 105,
    backgroundColor: "#FAFAF8",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    overflow: "hidden",
  },

  descriptionInput: {
    flex: 1,
    minHeight: 105,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },

  /* SAVE */
  saveSection: {
    gap: 12,
    paddingTop: 2,
  },

  saveHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 4,
  },

  saveHintText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 11.5,
    lineHeight: 17,
    marginLeft: 7,
  },

  /* PRESS STATES */
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
});
