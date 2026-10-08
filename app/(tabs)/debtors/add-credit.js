
import { useCallback, useEffect, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  Modal,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";

import Button from "@/components/Button";

import {
  colors,
  spacing,
  typography,
  radius,
} from "@/constants/theme";

import { formatCurrency } from "@/lib/format";

import {
  addCreditTransaction,
  createSale,
  getDebtor,
  getProducts,
} from "@/db/database";

import { useAuth } from "@/context/AuthContext";

import {
  canSellByItem,
  formatStockQuantity,
  getSalePricing,
} from "@/lib/inventory";

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

  /* =========================================================
     MAY UTANG PA / CREDIT LIMIT MODAL
  ========================================================= */

  const [creditLimitModalVisible, setCreditLimitModalVisible] =
    useState(false);

  const [creditLimitModalData, setCreditLimitModalData] = useState({
    remainingCredit: 0,
    creditLimit: 0,
    currentBalance: 0,
    requestedCredit: 0,
  });

  /* =========================================================
     LOAD PRODUCTS
  ========================================================= */

  const load = useCallback(
    async (q) => {
      try {
        const rows = await getProducts(
          db,
          user?.id,
          q?.trim() || undefined
        );

        setProducts(rows);
      } catch (error) {
        console.error("Failed to load products:", error);
      }
    },
    [db, user]
  );

  /* =========================================================
     LOAD DEBTOR + PRODUCTS
  ========================================================= */

  useEffect(() => {
    let active = true;

    Promise.all([
      getProducts(db, user?.id),
      getDebtor(db, debtorId, user?.id),
    ])
      .then(([productRows, debtorRecord]) => {
        if (!active) return;

        setProducts(productRows);
        setDebtor(debtorRecord);
      })
      .catch((error) => {
        console.error("Failed to load credit screen:", error);
      });

    return () => {
      active = false;
    };
  }, [db, debtorId, user?.id]);

  /* =========================================================
     SHOW MAY UTANG PA MODAL
  ========================================================= */

  function showCreditLimitModal({
    remainingCredit,
    creditLimit,
    currentBalance,
    requestedCredit,
  }) {
    setCreditLimitModalData({
      remainingCredit,
      creditLimit,
      currentBalance,
      requestedCredit,
    });

    setCreditLimitModalVisible(true);
  }

  /* =========================================================
     ADD PRODUCT
  ========================================================= */

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

    const creditLimit = Number(debtor?.credit_limit || 0);
    const currentBalance = Number(debtor?.balance || 0);

    if (creditLimit > 0) {
      const currentCartTotal = Object.values(cart).reduce(
        (sum, item) => {
          const itemPricing = getSalePricing(
            item.product,
            item.saleMode
          );

          return (
            sum +
            item.quantity * itemPricing.unitPrice
          );
        },
        0
      );

      const newItemAmount = Number(
        pricing.unitPrice || 0
      );

      const newTotalCredit =
        currentBalance +
        currentCartTotal +
        newItemAmount;

      if (newTotalCredit > creditLimit) {
        const remainingCredit = Math.max(
          0,
          creditLimit -
            currentBalance -
            currentCartTotal
        );

        showCreditLimitModal({
          remainingCredit,
          creditLimit,
          currentBalance,
          requestedCredit: newItemAmount,
        });

        return;
      }
    }

    setCart((current) => {
      const nextQuantity =
        current[product.id]?.quantity || 0;

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

  /* =========================================================
     CHOOSE SALE MODE
  ========================================================= */

  function chooseSaleMode(product) {
    const existing = cart[product.id];

    if (existing) {
      return addToCart(
        product,
        existing.saleMode
      );
    }

    if (!canSellByItem(product)) {
      return addToCart(product);
    }

    Alert.alert(
      `Add ${product.name}`,
      "Choose how to sell this product.",
      [
        {
          text: `Package — ${formatCurrency(
            product.unit_price
          )}`,
          onPress: () =>
            addToCart(product, "package"),
        },
        {
          text: `Single item — ${formatCurrency(
            product.item_price
          )}`,
          onPress: () =>
            addToCart(product, "item"),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  }

  /* =========================================================
     REMOVE PRODUCT
  ========================================================= */

  function removeFromCart(productId) {
    setCart((current) => {
      const existing = current[productId];

      if (!existing) {
        return current;
      }

      if (existing.quantity <= 1) {
        const next = {
          ...current,
        };

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

  /* =========================================================
     TOTALS
  ========================================================= */

  const cartItems = Object.values(cart);

  const cartCount = cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const cartTotal = cartItems.reduce(
    (sum, item) =>
      sum +
      item.quantity *
        getSalePricing(
          item.product,
          item.saleMode
        ).unitPrice,
    0
  );

  const hasProducts = cartItems.length > 0;

  const amountValue = hasProducts
    ? cartTotal.toFixed(2)
    : manualAmount;

  const amountNumber = hasProducts
    ? cartTotal
    : Number(manualAmount) || 0;

  /* =========================================================
     SAVE
  ========================================================= */

  async function handleSave() {
    if (!hasProducts && amountNumber <= 0) {
      Alert.alert(
        "Invalid amount",
        "Select products or enter an amount greater than zero."
      );

      return;
    }

    const creditLimit =
      Number(debtor?.credit_limit || 0);

    const currentBalance =
      Number(debtor?.balance || 0);

    if (creditLimit > 0) {
      const newTotalCredit =
        currentBalance + amountNumber;

      if (newTotalCredit > creditLimit) {
        const remainingCredit = Math.max(
          0,
          creditLimit - currentBalance
        );

        showCreditLimitModal({
          remainingCredit,
          creditLimit,
          currentBalance,
          requestedCredit: amountNumber,
        });

        return;
      }
    }

    setSaving(true);

    try {
      if (hasProducts) {
        await createSale(
          db,
          user?.id,
          {
            saleType: "credit",
            debtorId: String(debtorId),
            items: cartItems,
            description:
              description.trim() || null,
          }
        );
      } else {
        await addCreditTransaction(
          db,
          {
            userId: user?.id,
            debtorId: String(debtorId),
            amount: amountNumber,
            description:
              description.trim() || null,
            productId: null,
            quantity: null,
          }
        );
      }

      router.back();
    } catch (error) {
      Alert.alert(
        "Could not save credit sale",
        error?.message ||
          "Please check the credit limit, stock, and try again."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     PRODUCT ROW
  ========================================================= */

  function renderProduct(item) {
    const inCart =
      cart[item.id]?.quantity || 0;

    const outOfStock =
      Number(item.stock_quantity) <= 0;

    const saleMode =
      cart[item.id]?.saleMode || "package";

    const stockItems =
      getSalePricing(
        item,
        saleMode
      ).stockItems;

    const atMaxStock =
      inCart * stockItems >=
      Number(item.stock_quantity);

    const lowStock =
      Number(item.stock_quantity) <= 5;

    return (
      <View
        key={item.id}
        style={[
          styles.row,
          inCart > 0 && styles.rowSelected,
        ]}
      >
        <View
          style={[
            styles.productIcon,
            outOfStock &&
              styles.productIconDisabled,
            inCart > 0 &&
              styles.productIconSelected,
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

        <View style={styles.productCol}>
          <Text
            style={[
              styles.productName,
              outOfStock &&
                styles.productNameDisabled,
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>

          <View style={styles.productDetails}>
            <Text style={styles.productPrice}>
              {formatCurrency(
                getSalePricing(
                  item,
                  "item"
                ).unitPrice
              )}
            </Text>

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
                  : `${formatStockQuantity(
                      item.stock_quantity,
                      item.unit
                    )} in stock`}
              </Text>
            </View>
          </View>
        </View>

        {inCart > 0 ? (
          <View style={styles.qtyControl}>
            <Pressable
              style={({ pressed }) => [
                styles.qtyButton,
                pressed &&
                  styles.qtyButtonPressed,
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
              onPress={() =>
                chooseSaleMode(item)
              }
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
            onPress={() =>
              chooseSaleMode(item)
            }
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
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top"]}
    >
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
          <Ionicons
            name="arrow-back"
            size={21}
            color={colors.navy}
          />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text
            style={styles.headerEyebrow}
            numberOfLines={1}
          >
            {debtor
              ? debtor.full_name.toUpperCase()
              : "DEBTOR ACCOUNT"}
          </Text>

          <Text style={styles.title}>
            Log credit sale
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      {/* =====================================================
          MAY UTANG PA MODAL
      ===================================================== */}

      <Modal
        visible={creditLimitModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setCreditLimitModalVisible(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.creditModal}>

            {/* WARNING ICON */}

            <View style={styles.warningIconOuter}>
              <View style={styles.warningIconInner}>
                <Ionicons
                  name="alert"
                  size={32}
                  color={colors.goldDark}
                />
              </View>
            </View>

            {/* TITLE */}

            <Text style={styles.creditModalTitle}>
              May Utang Pa
            </Text>

            {/* DESCRIPTION */}

            <Text style={styles.creditModalSubtitle}>
              {debtor?.full_name || "This customer"}{" "}
              still has an outstanding balance.
              This new credit cannot be added
              because it would exceed the allowed
              credit limit.
            </Text>

            {/* CURRENT UTANG */}

            <View style={styles.balanceWarningCard}>
              <View style={styles.balanceWarningIcon}>
                <Ionicons
                  name="wallet-outline"
                  size={22}
                  color={colors.goldDark}
                />
              </View>

              <View style={styles.balanceWarningText}>
                <Text style={styles.balanceWarningLabel}>
                  CURRENT UTANG
                </Text>

                <Text style={styles.balanceWarningAmount}>
                  {formatCurrency(
                    creditLimitModalData.currentBalance
                  )}
                </Text>
              </View>

              <View style={styles.balanceWarningBadge}>
                <Ionicons
                  name="alert-circle"
                  size={13}
                  color={colors.goldDark}
                />

                <Text style={styles.balanceWarningBadgeText}>
                  UNPAID
                </Text>
              </View>
            </View>

            {/* SUMMARY */}

            <View style={styles.creditSummary}>

              <View style={styles.creditSummaryRow}>
                <View style={styles.creditSummaryLabelWrap}>
                  <View style={styles.summaryIconBox}>
                    <Ionicons
                      name="shield-outline"
                      size={16}
                      color={colors.navy}
                    />
                  </View>

                  <Text style={styles.creditSummaryLabel}>
                    Credit limit
                  </Text>
                </View>

                <Text style={styles.creditSummaryValue}>
                  {formatCurrency(
                    creditLimitModalData.creditLimit
                  )}
                </Text>
              </View>

              <View style={styles.creditSummaryDivider} />

              <View style={styles.creditSummaryRow}>
                <View style={styles.creditSummaryLabelWrap}>
                  <View style={styles.summaryIconBox}>
                    <Ionicons
                      name="wallet-outline"
                      size={16}
                      color={colors.navy}
                    />
                  </View>

                  <Text style={styles.creditSummaryLabel}>
                    Current balance
                  </Text>
                </View>

                <Text style={styles.creditSummaryValue}>
                  {formatCurrency(
                    creditLimitModalData.currentBalance
                  )}
                </Text>
              </View>

              <View style={styles.creditSummaryDivider} />

              <View style={styles.creditSummaryRow}>
                <View style={styles.creditSummaryLabelWrap}>
                  <View style={styles.summaryIconBoxGreen}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={16}
                      color="#2E7D32"
                    />
                  </View>

                  <Text style={styles.creditSummaryLabel}>
                    Remaining credit
                  </Text>
                </View>

                <Text style={styles.remainingCreditValue}>
                  {formatCurrency(
                    creditLimitModalData.remainingCredit
                  )}
                </Text>
              </View>

            </View>

            {/* REQUESTED */}

            <View style={styles.requestedCreditBox}>
              <View style={styles.requestedCreditIcon}>
                <Ionicons
                  name="cart-outline"
                  size={19}
                  color={colors.goldDark}
                />
              </View>

              <View style={styles.requestedCreditTextWrap}>
                <Text style={styles.requestedCreditLabel}>
                  NEW CREDIT REQUESTED
                </Text>

                <Text style={styles.requestedCreditAmount}>
                  {formatCurrency(
                    creditLimitModalData.requestedCredit
                  )}
                </Text>
              </View>
            </View>

            {/* MESSAGE */}

            <View style={styles.creditWarning}>
              <View style={styles.creditWarningIcon}>
                <Ionicons
                  name="information"
                  size={15}
                  color={colors.goldDark}
                />
              </View>

              <Text style={styles.creditWarningText}>
                Please reduce the purchase amount
                or ask the customer to make a
                payment first.
              </Text>
            </View>

            {/* BUTTON */}

            <Pressable
              style={({ pressed }) => [
                styles.creditModalButton,
                pressed &&
                  styles.creditModalButtonPressed,
              ]}
              onPress={() =>
                setCreditLimitModalVisible(false)
              }
            >
              <Text style={styles.creditModalButtonText}>
                Okay, Got It
              </Text>

              <View style={styles.modalButtonIcon}>
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={colors.navy}
                />
              </View>
            </Pressable>

          </View>
        </View>
      </Modal>

      {/* MAIN */}

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.form}
      >

        {/* HERO */}

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="receipt-outline"
              size={25}
              color={colors.goldLight}
            />
          </View>

          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>
              New credit sale
            </Text>

            <Text style={styles.heroSubtitle}>
              Record items or an amount to add
              to the debtor&apos;s balance.
            </Text>
          </View>
        </View>

        {/* PRODUCTS */}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="cube-outline"
                size={19}
                color={colors.navy}
              />
            </View>

            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>
                Products
              </Text>

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

          {/* PRODUCTS */}

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
              <Text style={styles.amountEyebrow}>
                CREDIT AMOUNT
              </Text>

              <Text style={styles.amountLabel}>
                {hasProducts
                  ? "Total of selected products"
                  : "Amount to add"}
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
            <Text style={styles.currencySymbol}>
              ₱
            </Text>

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
            <Text style={styles.totalLabel}>
              Outstanding credit
            </Text>

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
              <Text style={styles.sectionTitle}>
                Description
              </Text>

              <Text style={styles.sectionSubtitle}>
                Add a note about this sale
              </Text>
            </View>
          </View>

          <Text style={styles.label}>
            Description
          </Text>

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

        {/* SAVE */}

        <View style={styles.saveSection}>
          <View style={styles.saveHint}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.textMuted}
            />

            <Text style={styles.saveHintText}>
              This credit sale will be added to
              the debtor&apos;s outstanding balance.
            </Text>
          </View>

          <Button
            title="Save credit sale"
            onPress={handleSave}
            loading={saving}
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

/* =============================================================
   STYLES
============================================================= */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },

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

  form: {
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    paddingBottom: spacing.lg,
    gap: 14,
  },

  heroCard: {
    backgroundColor: colors.navy,
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
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

  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
    marginRight: 8,
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
    flexDirection: "column",
    alignItems: "flex-start",
    marginTop: 6,
    gap: 4,
  },

  productPrice: {
    fontSize: 12,
    color: colors.navy,
    fontWeight: "800",
  },

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
  },

  qtyButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
    width: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  qtyText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.navy,
  },

  amountCard: {
    backgroundColor: colors.navy,
    borderRadius: 22,
    padding: 18,
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

  /* =========================================================
     MODAL
  ========================================================= */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 25, 47, 0.78)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  creditModal: {
    width: "100%",
    maxWidth: 430,
    backgroundColor: colors.white,
    borderRadius: 28,

    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,

    alignItems: "center",

    borderWidth: 1,
    borderColor: "#FFFFFF",

    shadowColor: colors.navy,
    shadowOffset: {
      width: 0,
      height: 14,
    },
    shadowOpacity: 0.3,
    shadowRadius: 28,
    elevation: 18,
  },

  warningIconOuter: {
    width: 82,
    height: 82,
    borderRadius: 28,
    backgroundColor: "#FFF9E5",

    alignItems: "center",
    justifyContent: "center",

    marginBottom: 14,

    borderWidth: 1,
    borderColor: "#F2DF9B",
  },

  warningIconInner: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "#FFEFB2",

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 1,
    borderColor: "#F0D878",
  },

  creditModalTitle: {
    color: colors.navy,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },

  creditModalSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 5,
  },

  balanceWarningCard: {
    width: "100%",

    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#FFF8DF",

    borderWidth: 1,
    borderColor: "#F0DB91",

    borderRadius: 17,

    padding: 13,

    marginBottom: 12,
  },

  balanceWarningIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,

    backgroundColor: "#FFEFB5",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 10,
  },

  balanceWarningText: {
    flex: 1,
  },

  balanceWarningLabel: {
    color: colors.goldDark,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 2,
  },

  balanceWarningAmount: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: "900",
  },

  balanceWarningBadge: {
    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 8,
    paddingVertical: 6,

    borderRadius: radius.full,

    backgroundColor: "#FFF0B8",

    gap: 4,
  },

  balanceWarningBadgeText: {
    color: colors.goldDark,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  creditSummary: {
    width: "100%",

    backgroundColor: "#FAFAF7",

    borderRadius: 18,

    borderWidth: 1,
    borderColor: colors.border,

    paddingHorizontal: 15,
    paddingVertical: 5,
  },

  creditSummaryRow: {
    minHeight: 48,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  creditSummaryLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  summaryIconBox: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryIconBoxGreen: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#EAF5EA",
    alignItems: "center",
    justifyContent: "center",
  },

  creditSummaryLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },

  creditSummaryValue: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "900",
  },

  remainingCreditValue: {
    color: "#2E7D32",
    fontSize: 15,
    fontWeight: "900",
  },

  creditSummaryDivider: {
    height: 1,
    backgroundColor: colors.border,
  },

  requestedCreditBox: {
    width: "100%",

    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#FFF9E8",

    borderWidth: 1,
    borderColor: "#F1DEA0",

    borderRadius: 16,

    padding: 12,

    marginTop: 12,
  },

  requestedCreditIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,

    backgroundColor: "#FFF0B8",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 10,
  },

  requestedCreditTextWrap: {
    flex: 1,
  },

  requestedCreditLabel: {
    color: colors.textMuted,
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  requestedCreditAmount: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "900",
  },

  creditWarning: {
    width: "100%",

    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#F8F6EE",

    borderWidth: 1,
    borderColor: colors.border,

    borderRadius: 15,

    padding: 12,

    marginTop: 12,
    marginBottom: 16,
  },

  creditWarningIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,

    backgroundColor: "#FFF0B8",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 8,
  },

  creditWarningText: {
    flex: 1,

    color: colors.textMuted,

    fontSize: 11.5,
    lineHeight: 17,
  },

  creditModalButton: {
    width: "100%",
    minHeight: 52,

    borderRadius: 17,

    backgroundColor: colors.navy,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 9,

    elevation: 5,
  },

  creditModalButtonPressed: {
    opacity: 0.82,

    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  creditModalButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "900",
  },

  modalButtonIcon: {
    width: 25,
    height: 25,
    borderRadius: 9,

    backgroundColor: colors.goldLight,

    alignItems: "center",
    justifyContent: "center",
  },

  pressed: {
    opacity: 0.72,

    transform: [
      {
        scale: 0.97,
      },
    ],
  },
});
