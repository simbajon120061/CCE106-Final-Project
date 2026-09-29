
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";

import Button from "@/components/Button";
import BottomNav, { bottomNavHeight } from "@/components/BottomNav";
import {
  colors,
  spacing,
  typography,
  radius,
} from "@/constants/theme";
import { formatCurrency } from "@/lib/format";
import {
  addCreditTransaction,
  getProducts,
} from "@/db/database";

export default function AddCreditScreen() {
  const { debtorId } = useLocalSearchParams();
  const db = useSQLiteContext();
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState("1");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    getProducts(db).then(setProducts);
  }, [db]);

  function calculateProductAmount(product, nextQuantity) {
    const qty = Number(nextQuantity) || 0;
    return (product.unit_price * qty).toFixed(2);
  }

  function handleSelectProduct(product) {
    setSelectedProduct(product);
    setAmount(calculateProductAmount(product, quantity));
    setPickerOpen(false);
  }

  function handleQuantityChange(nextQuantity) {
    setQuantity(nextQuantity);

    if (selectedProduct) {
      setAmount(
        calculateProductAmount(selectedProduct, nextQuantity)
      );
    }
  }

  async function handleSave() {
    const amt = Number(amount);

    if (!amt || amt <= 0) {
      Alert.alert(
        "Invalid amount",
        "Enter an amount greater than zero."
      );
      return;
    }

    setSaving(true);

    try {
      await addCreditTransaction(db, {
        debtorId: Number(debtorId),
        amount: amt,
        description:
          description.trim() ||
          selectedProduct?.name ||
          null,
        productId: selectedProduct?.id ?? null,
        quantity: selectedProduct
          ? Number(quantity) || 1
          : null,
      });

      router.back();
    } finally {
      setSaving(false);
    }
  }

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
          <Ionicons
            name="arrow-back"
            size={21}
            color={colors.navy}
          />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerEyebrow}>
            DEBTOR ACCOUNT
          </Text>
          <Text style={styles.title}>Log credit sale</Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
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
            <Text style={styles.heroTitle}>
              New credit sale
            </Text>

            <Text style={styles.heroSubtitle}>
              Record an item or amount to add to the debtor's
              balance.
            </Text>
          </View>
        </View>

        {/* PRODUCT SECTION */}
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
                Product
              </Text>
              <Text style={styles.sectionSubtitle}>
                Optional inventory item
              </Text>
            </View>
          </View>

          <Text style={styles.label}>
            Link a product (optional)
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.productPicker,
              pickerOpen && styles.productPickerOpen,
              pressed && styles.pressedLight,
            ]}
            onPress={() => setPickerOpen((v) => !v)}
          >
            <View style={styles.productPickerLeft}>
              <View
                style={[
                  styles.productPickerIcon,
                  selectedProduct &&
                    styles.productPickerIconSelected,
                ]}
              >
                <Ionicons
                  name={
                    selectedProduct
                      ? "cube"
                      : "search-outline"
                  }
                  size={19}
                  color={
                    selectedProduct
                      ? colors.goldDark
                      : colors.textMuted
                  }
                />
              </View>

              <View style={styles.productPickerTextWrap}>
                <Text
                  numberOfLines={1}
                  style={
                    selectedProduct
                      ? styles.productText
                      : styles.productPlaceholder
                  }
                >
                  {selectedProduct
                    ? selectedProduct.name
                    : "Select from inventory"}
                </Text>

                {selectedProduct && (
                  <Text style={styles.productUnitPrice}>
                    {formatCurrency(
                      selectedProduct.unit_price
                    )}{" "}
                    per unit
                  </Text>
                )}
              </View>
            </View>

            <Ionicons
              name={
                pickerOpen
                  ? "chevron-up"
                  : "chevron-down"
              }
              size={19}
              color={colors.textMuted}
            />
          </Pressable>

          {/* DROPDOWN */}
          {pickerOpen && (
            <View style={styles.dropdown}>
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
                    No inventory items yet.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={products}
                  keyExtractor={(p) => String(p.id)}
                  style={styles.productList}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <Pressable
                      style={({ pressed }) => [
                        styles.dropdownRow,
                        selectedProduct?.id === item.id &&
                          styles.dropdownRowSelected,
                        pressed && styles.pressedLight,
                      ]}
                      onPress={() =>
                        handleSelectProduct(item)
                      }
                    >
                      <View style={styles.dropdownLeft}>
                        <View style={styles.dropdownIcon}>
                          <Ionicons
                            name="cube-outline"
                            size={17}
                            color={colors.navy}
                          />
                        </View>

                        <View style={styles.dropdownNameWrap}>
                          <Text
                            style={styles.dropdownName}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>

                          <Text style={styles.dropdownSmall}>
                            Inventory item
                          </Text>
                        </View>
                      </View>

                      <View style={styles.priceBadge}>
                        <Text style={styles.dropdownPrice}>
                          {formatCurrency(
                            item.unit_price
                          )}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                />
              )}

              {selectedProduct && (
                <Pressable
                  style={({ pressed }) => [
                    styles.clearRow,
                    pressed && styles.pressedLight,
                  ]}
                  onPress={() => {
                    setSelectedProduct(null);
                    setAmount("");
                    setPickerOpen(false);
                  }}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={18}
                    color={colors.danger}
                  />

                  <Text style={styles.clearText}>
                    Clear selection
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* QUANTITY */}
        {selectedProduct && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="layers-outline"
                  size={19}
                  color={colors.navy}
                />
              </View>

              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>
                  Quantity
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Number of units sold
                </Text>
              </View>
            </View>

            <Text style={styles.label}>Quantity</Text>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="layers-outline"
                size={19}
                color={colors.textMuted}
                style={styles.inputIcon}
              />

              <TextInput
                value={quantity}
                onChangeText={handleQuantityChange}
                keyboardType="number-pad"
                style={styles.inputWithIcon}
              />
            </View>
          </View>
        )}

        {/* AMOUNT */}
        <View style={styles.amountCard}>
          <View style={styles.amountTop}>
            <View>
              <Text style={styles.amountEyebrow}>
                CREDIT AMOUNT
              </Text>

              <Text style={styles.amountLabel}>
                Amount to add
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
              value={amount}
              onChangeText={setAmount}
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
              {formatCurrency(Number(amount) || 0)}
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
              This credit sale will be added to the debtor's
              outstanding balance.
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

function Field({ label, children }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
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
    shadowOffset: {
      width: 0,
      height: 3,
    },
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
    paddingBottom:
      bottomNavHeight + spacing.xl + 20,
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
    shadowOffset: {
      width: 0,
      height: 7,
    },
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
    shadowOffset: {
      width: 0,
      height: 3,
    },
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

  /* PRODUCT PICKER */
  productPicker: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FAFAF8",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    paddingHorizontal: 12,
  },

  productPickerOpen: {
    borderColor: colors.goldDark,
  },

  productPickerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },

  productPickerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  productPickerIconSelected: {
    backgroundColor: "#F5E8BD",
  },

  productPickerTextWrap: {
    flex: 1,
  },

  productText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "700",
  },

  productPlaceholder: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "500",
  },

  productUnitPrice: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
  },

  /* DROPDOWN */
  dropdown: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    marginTop: 8,
    overflow: "hidden",
  },

  productList: {
    maxHeight: 230,
  },

  dropdownRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  dropdownRowSelected: {
    backgroundColor: "#FAF7EC",
  },

  dropdownLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },

  dropdownIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  dropdownNameWrap: {
    flex: 1,
  },

  dropdownName: {
    fontSize: 13.5,
    color: colors.text,
    fontWeight: "700",
  },

  dropdownSmall: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 3,
  },

  priceBadge: {
    backgroundColor: "#F5F1E3",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
  },

  dropdownPrice: {
    fontSize: 12,
    color: colors.navy,
    fontWeight: "800",
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

  clearRow: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: "#FFF9F9",
  },

  clearText: {
    color: colors.danger,
    fontSize: 12.5,
    fontWeight: "700",
  },

  /* INPUT */
  inputWrapper: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAF8",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
  },

  inputIcon: {
    marginLeft: 14,
  },

  inputWithIcon: {
    flex: 1,
    paddingHorizontal: 11,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.text,
    fontWeight: "600",
  },

  /* AMOUNT CARD */
  amountCard: {
    backgroundColor: colors.navy,
    borderRadius: 22,
    padding: 18,
    shadowColor: colors.navy,
    shadowOffset: {
      width: 0,
      height: 6,
    },
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

  pressedLight: {
    opacity: 0.72,
  },
});

