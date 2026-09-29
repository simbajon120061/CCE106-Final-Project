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
import { useEffect, useState } from "react";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";

import Button from "@/components/Button";
import BottomNav, {
  bottomNavHeight,
} from "@/components/BottomNav";
import UnitDropdown from "@/components/UnitDropdown";
import {
  colors,
  spacing,
  typography,
  radius,
} from "@/constants/theme";
import {
  getProduct,
  updateProduct,
  deleteProduct,
} from "@/db/database";
import { useAuth } from "@/context/AuthContext";
import { formatStockQuantity, stockUnitLabel } from "@/lib/inventory";

export default function EditProductScreen() {
  const { id } = useLocalSearchParams();
  const db = useSQLiteContext();
  const router = useRouter();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("piece");
  const [measurementValue, setMeasurementValue] = useState("");
  const [price, setPrice] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [stock, setStock] = useState("");
  const [threshold, setThreshold] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProduct(db, user?.id, Number(id)).then((p) => {
      if (!p) return;

      setProduct(p);
      setName(p.name);
      setCategory(p.category || "");
      setUnit(p.unit || "piece");
      setMeasurementValue(
        p.measurement_value == null ? "" : String(p.measurement_value)
      );
      setPrice(String(p.unit_price));
      setItemPrice(p.item_price == null ? "" : String(p.item_price));
      setStock(String(p.stock_quantity));
      setThreshold(String(p.low_stock_threshold));
    });
  }, [db, id, user?.id]);

  async function handleSave() {
    if (!name.trim() || !price) {
      Alert.alert(
        "Missing info",
        "Product name and unit price are required."
      );
      return;
    }

    if (unit === "piece" && !Number.isInteger(Number(stock || 0))) {
      Alert.alert("Invalid stock", "Pieces must be counted as whole items.");
      return;
    }

    setSaving(true);

    try {
      await updateProduct(db, user?.id, Number(id), {
        name: name.trim(),
        category: category.trim() || null,
        unit,
        measurement_value:
          measurementValue === "" ? null : Number(measurementValue) || 0,
        unit_price: Number(price) || 0,
        item_price: itemPrice === "" ? null : Number(itemPrice) || 0,
        stock_quantity: Number(stock) || 0,
        low_stock_threshold:
          Number(threshold) || 0,
      });

      router.back();
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      "Remove product",
      `Remove ${product?.name} from inventory?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteProduct(
              db, user?.id,
              Number(id)
            );
            router.back();
          },
        },
      ]
    );
  }

  if (!product) return null;

  const stockNumber = Number(stock) || 0;
  const thresholdNumber =
    Number(threshold) || 0;

  const isLowStock =
    stockNumber > 0 &&
    stockNumber <= thresholdNumber;

  const isOutOfStock = stockNumber <= 0;

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top"]}
    >
      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="arrow-back"
            size={21}
            color={colors.navy}
          />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.title}>
            Edit Product
          </Text>

          <Text style={styles.headerSubtitle}>
            Update inventory details
          </Text>
        </View>

        <Pressable
          onPress={handleDelete}
          hitSlop={12}
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.deletePressed,
          ]}
        >
          <Ionicons
            name="trash-outline"
            size={19}
            color={colors.danger}
          />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.form}
      >
        {/* ================= PRODUCT SUMMARY ================= */}
        <View style={styles.productSummary}>
          <View
            style={[
              styles.productIcon,
              isOutOfStock &&
                styles.productIconOut,
              isLowStock &&
                styles.productIconLow,
            ]}
          >
            <Ionicons
              name="cube-outline"
              size={27}
              color={
                isOutOfStock
                  ? colors.textMuted
                  : isLowStock
                  ? colors.danger
                  : colors.navy
              }
            />
          </View>

          <View style={styles.summaryInfo}>
            <Text
              style={styles.summaryName}
              numberOfLines={2}
            >
              {name || product.name}
            </Text>

            {category ? (
              <View style={styles.categoryRow}>
                <Ionicons
                  name="pricetag-outline"
                  size={12}
                  color={colors.textMuted}
                />

                <Text
                  style={styles.categoryText}
                  numberOfLines={1}
                >
                  {category}
                </Text>
              </View>
            ) : (
              <Text style={styles.categoryText}>
                Product information
              </Text>
            )}
          </View>

          <View
            style={[
              styles.statusBadge,
              isOutOfStock &&
                styles.statusBadgeOut,
              isLowStock &&
                styles.statusBadgeLow,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isOutOfStock &&
                  styles.statusTextOut,
                isLowStock &&
                  styles.statusTextLow,
              ]}
            >
              {isOutOfStock
                ? "OUT"
                : isLowStock
                ? "LOW"
                : "ACTIVE"}
            </Text>
          </View>
        </View>

        {/* ================= PRODUCT DETAILS ================= */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color={colors.navy}
              />
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Product details
              </Text>

              <Text style={styles.sectionSubtitle}>
                Update the product information
              </Text>
            </View>
          </View>

          <View style={styles.fieldsCard}>
            <Field
              label="Product name *"
              icon="pricetag-outline"
            >
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Product name"
                placeholderTextColor={
                  colors.textMuted
                }
                style={styles.input}
              />
            </Field>

            <Field
              label="Category"
              icon="grid-outline"
            >
              <TextInput
                value={category}
                onChangeText={setCategory}
                placeholder="e.g. Noodles, Drinks, Canned goods"
                placeholderTextColor={
                  colors.textMuted
                }
                style={styles.input}
              />
            </Field>

            <Field
              label="Numerical value"
              icon="calculator-outline"
            >
              <TextInput
                value={measurementValue}
                onChangeText={setMeasurementValue}
                keyboardType="decimal-pad"
                placeholder="e.g. 500"
                placeholderTextColor={
                  colors.textMuted
                }
                style={styles.input}
              />
            </Field>

            <Field
              label="Unit of measurement"
              icon="resize-outline"
            >
              <UnitDropdown value={unit} onChange={setUnit} />
            </Field>

            <Field
              label="Package price (₱) *"
              icon="cash-outline"
            >
              <View style={styles.priceWrapper}>
                <View style={styles.currencyBox}>
                  <Text style={styles.currencyText}>
                    ₱
                  </Text>
                </View>

                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={
                    colors.textMuted
                  }
                  style={styles.priceInput}
                />
              </View>
            </Field>

            <Field
              label="Single-item price (₱)"
              icon="cash-outline"
            >
              <View style={styles.priceWrapper}>
                <View style={styles.currencyBox}>
                  <Text style={styles.currencyText}>₱</Text>
                </View>

                <TextInput
                  value={itemPrice}
                  onChangeText={setItemPrice}
                  keyboardType="decimal-pad"
                  placeholder="Optional: price for one item"
                  placeholderTextColor={colors.textMuted}
                  style={styles.priceInput}
                />
              </View>
            </Field>
          </View>
        </View>

        {/* ================= INVENTORY ================= */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="layers-outline"
                size={18}
                color={colors.navy}
              />
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Inventory
              </Text>

              <Text style={styles.sectionSubtitle}>
                Manage stock quantity and alerts
              </Text>
            </View>
          </View>

          <View style={styles.fieldsCard}>
            <Field
              label={`Stock quantity (${stockUnitLabel(unit, stockNumber)})`}
              icon="cube-outline"
            >
              <View style={styles.stepperRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.stepperButton,
                    pressed &&
                      styles.stepperPressed,
                  ]}
                  onPress={() =>
                    setStock(
                      String(
                        Math.max(
                          0,
                          stockNumber - 1
                        )
                      )
                    )
                  }
                >
                  <Ionicons
                    name="remove"
                    size={20}
                    color={colors.navy}
                  />
                </Pressable>

                <View style={styles.stockInputWrap}>
                  <TextInput
                    value={stock}
                    onChangeText={setStock}
                    keyboardType="number-pad"
                    style={styles.stockInput}
                  />

                  <Text style={styles.stockUnit}>
                    {stockUnitLabel(unit, stockNumber)}
                  </Text>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.stepperButton,
                    pressed &&
                      styles.stepperPressed,
                  ]}
                  onPress={() =>
                    setStock(
                      String(
                        stockNumber + 1
                      )
                    )
                  }
                >
                  <Ionicons
                    name="add"
                    size={20}
                    color={colors.navy}
                  />
                </Pressable>
              </View>
            </Field>

            <Field
              label="Low stock alert threshold"
              icon="notifications-outline"
            >
              <TextInput
                value={threshold}
                onChangeText={setThreshold}
                keyboardType="number-pad"
                placeholder="5"
                placeholderTextColor={
                  colors.textMuted
                }
                style={styles.input}
              />

              <View style={styles.helperRow}>
                <Ionicons
                  name="information-circle-outline"
                  size={15}
                  color={colors.textMuted}
                />

                <Text style={styles.helperText}>
                  The product will be considered low
                  stock when it reaches this quantity.
                </Text>
              </View>
            </Field>
          </View>
        </View>

        {/* ================= CURRENT STOCK CARD ================= */}
        <View style={styles.stockOverview}>
          <View style={styles.stockOverviewIcon}>
            <Ionicons
              name={
                isOutOfStock
                  ? "close-circle-outline"
                  : isLowStock
                  ? "warning-outline"
                  : "checkmark-circle-outline"
              }
              size={22}
              color={
                isOutOfStock
                  ? colors.textMuted
                  : isLowStock
                  ? colors.danger
                  : colors.navy
              }
            />
          </View>

          <View style={styles.stockOverviewInfo}>
            <Text style={styles.stockOverviewLabel}>
              Current stock
            </Text>

            <Text
              style={[
                styles.stockOverviewValue,
                isLowStock && {
                  color: colors.danger,
                },
                isOutOfStock && {
                  color: colors.textMuted,
                },
              ]}
            >
              {formatStockQuantity(stockNumber, unit)}
            </Text>
          </View>

          <View style={styles.thresholdInfo}>
            <Text style={styles.thresholdLabel}>
              Alert at
            </Text>

            <Text style={styles.thresholdValue}>
              {thresholdNumber}
            </Text>
          </View>
        </View>

        {/* ================= SAVE ================= */}
        <View style={styles.saveSection}>
          <Button
            title="Save changes"
            onPress={handleSave}
            loading={saving}
          />
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      <BottomNav activeTab="inventory" />
    </SafeAreaView>
  );
}

function Field({
  label,
  icon,
  children,
}) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Ionicons
          name={icon}
          size={16}
          color={colors.navy}
        />

        <Text style={styles.label}>
          {label}
        </Text>
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },

  /* ================= HEADER ================= */

  header: {
    minHeight: 76,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.cream,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  headerButton: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  headerCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.sm,
  },

  title: {
    ...typography.heading,
    fontSize: 19,
    color: colors.navy,
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "600",
  },

  deleteButton: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },

  deletePressed: {
    opacity: 0.65,
    transform: [{ scale: 0.94 }],
  },

  /* ================= FORM ================= */

  form: {
    padding: spacing.md,
    paddingTop: spacing.md,
    paddingBottom:
      bottomNavHeight + 105,
    gap: spacing.lg,
  },

  /* ================= PRODUCT SUMMARY ================= */

  productSummary: {
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  productIcon: {
    width: 56,
    height: 56,
    borderRadius: 17,
    backgroundColor:
      "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  productIconLow: {
    backgroundColor:
      "rgba(217,169,40,0.18)",
  },

  productIconOut: {
    backgroundColor:
      "rgba(255,255,255,0.09)",
  },

  summaryInfo: {
    flex: 1,
    minWidth: 0,
  },

  summaryName: {
    color: colors.white,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900",
  },

  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },

  categoryText: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 10,
  },

  statusBadge: {
    backgroundColor: colors.white,
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  statusBadgeLow: {
    backgroundColor: colors.danger,
  },

  statusBadgeOut: {
    backgroundColor:
      "rgba(255,255,255,0.15)",
  },

  statusText: {
    color: colors.navy,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  statusTextLow: {
    color: colors.white,
  },

  statusTextOut: {
    color: "rgba(255,255,255,0.75)",
  },

  /* ================= SECTIONS ================= */

  section: {
    gap: spacing.sm,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: 2,
  },

  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: "900",
  },

  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },

  /* ================= FIELDS ================= */

  fieldsCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },

  field: {
    gap: 7,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  label: {
    ...typography.label,
    color: colors.navy,
    fontSize: 12,
    fontWeight: "800",
  },

  input: {
    minHeight: 50,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
  },

  /* ================= PRICE ================= */

  priceWrapper: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: "hidden",
  },

  currencyBox: {
    width: 48,
    height: 50,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },

  currencyText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "900",
  },

  priceInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },

  /* ================= STOCK STEPPER ================= */

  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  stepperButton: {
    width: 48,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  stepperPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },

  stockInputWrap: {
    flex: 1,
    minHeight: 50,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  stockInput: {
    flex: 1,
    minHeight: 48,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
    color: colors.navy,
    paddingHorizontal: 5,
  },

  stockUnit: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    paddingRight: 10,
  },

  /* ================= HELPER ================= */

  helperRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingHorizontal: 2,
  },

  helperText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 15,
  },

  /* ================= STOCK OVERVIEW ================= */

  stockOverview: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  stockOverviewIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },

  stockOverviewInfo: {
    flex: 1,
  },

  stockOverviewLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
  },

  stockOverviewValue: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 2,
  },

  thresholdInfo: {
    alignItems: "flex-end",
    paddingLeft: spacing.sm,
  },

  thresholdLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: "600",
  },

  thresholdValue: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2,
  },

  /* ================= SAVE ================= */

  saveSection: {
    marginTop: spacing.xs,
  },

  bottomSpace: {
    height: 10,
  },
});

