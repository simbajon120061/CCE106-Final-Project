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
import { useState } from "react";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";

import Button from "@/components/Button";
import UnitDropdown from "@/components/UnitDropdown";
import { colors, spacing, typography, radius } from "@/constants/theme";
import { createProduct } from "@/db/database";
import { useAuth } from "@/context/AuthContext";
import { stockUnitLabel } from "@/lib/inventory";

export default function NewProductScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("piece");
  const [measurementValue, setMeasurementValue] = useState("");
  const [price, setPrice] = useState("");
  const [packagePrice, setPackagePrice] = useState("");
  const [stock, setStock] = useState("");
  const [threshold, setThreshold] = useState("5");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim() || !price) {
      Alert.alert(
        "Missing info",
        "Product name and selling price are required."
      );
      return;
    }

    if (unit === "piece" && !Number.isInteger(Number(stock || 0))) {
      Alert.alert("Invalid stock", "Pieces must be counted as whole items.");
      return;
    }

    setSaving(true);

    try {
      await createProduct(db, user?.id, {
        name: name.trim(),
        category: category.trim() || null,
        unit,
        measurement_value:
          measurementValue === "" ? null : Number(measurementValue) || 0,
        unit_price: Number(packagePrice) || Number(price) || 0,
        item_price: Number(price) || 0,
        stock_quantity: Number(stock) || 0,
        low_stock_threshold: Number(threshold) || 5,
      });

      // Replace the modal with the list route so it mounts again and reads
      // the newly saved record from SQLite.
      router.replace("/inventory");
    } catch (error) {
      console.error("Could not create product", error);
      Alert.alert(
        "Could not save product",
        error?.message || "Please check the product details and try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
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
          <Text style={styles.title}>New Product</Text>
          <Text style={styles.headerSubtitle}>
            Add an item to your inventory
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Ionicons
            name="cube-outline"
            size={21}
            color={colors.navy}
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.form}
      >
        {/* Intro Card */}
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons
              name="cube"
              size={26}
              color={colors.white}
            />
          </View>

          <View style={styles.introContent}>
            <Text style={styles.introTitle}>
              Product information
            </Text>

            <Text style={styles.introText}>
              Enter the basic details of the product you want to
              keep in your inventory.
            </Text>
          </View>
        </View>

        {/* Product Details */}
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
                Basic product information
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
                placeholder="e.g. Lucky Me Pancit Canton"
                placeholderTextColor={colors.textMuted}
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
                placeholder="e.g. Noodles, Canned goods, Load"
                placeholderTextColor={colors.textMuted}
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
                placeholderTextColor={colors.textMuted}
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
              label="Selling price (₱) *"
              icon="cash-outline"
            >
              <View style={styles.inputWithPrefix}>
                <View style={styles.currencyBox}>
                  <Text style={styles.currencyText}>₱</Text>
                </View>

                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  style={styles.priceInput}
                />
              </View>
            </Field>

            <Field
              label="Package price (₱)"
              icon="cash-outline"
            >
              <View style={styles.inputWithPrefix}>
                <View style={styles.currencyBox}>
                  <Text style={styles.currencyText}>₱</Text>
                </View>

                <TextInput
                  value={packagePrice}
                  onChangeText={setPackagePrice}
                  keyboardType="decimal-pad"
                  placeholder="Optional"
                  placeholderTextColor={colors.textMuted}
                  style={styles.priceInput}
                />
              </View>
            </Field>

          </View>
        </View>

        {/* Inventory Details */}
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
                Inventory details
              </Text>
              <Text style={styles.sectionSubtitle}>
                Stock and low-stock settings
              </Text>
            </View>
          </View>

          <View style={styles.fieldsCard}>
            <Field
              label={`Starting stock quantity (${stockUnitLabel(unit, Number(stock))})`}
              icon="cube-outline"
            >
              <TextInput
                value={stock}
                onChangeText={setStock}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </Field>

            <Field
              label="Low stock alert threshold"
              icon="notifications-outline"
            >
              <TextInput
                value={threshold}
                onChangeText={setThreshold}
                keyboardType="number-pad"
                style={styles.input}
              />

              <View style={styles.helperRow}>
                <Ionicons
                  name="information-circle-outline"
                  size={15}
                  color={colors.textMuted}
                />

                <Text style={styles.helperText}>
                  You will see a low-stock indicator when inventory
                  reaches this quantity.
                </Text>
              </View>
            </Field>
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.saveSection}>
          <Button
            title="Save product"
            onPress={handleSave}
            loading={saving}
          />
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, icon, children }) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Ionicons
          name={icon}
          size={16}
          color={colors.navy}
        />

        <Text style={styles.label}>{label}</Text>
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

  /* Header */
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

  backButton: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitleWrap: {
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
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
  },

  headerIcon: {
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

  /* Main Form */
  form: {
    padding: spacing.md,
    paddingTop: spacing.md,
    paddingBottom:spacing.lg,
    gap: spacing.lg,
  },

  /* Intro */
  introCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    overflow: "hidden",
  },

  introIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  introContent: {
    flex: 1,
  },

  introTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },

  introText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    lineHeight: 18,
  },

  /* Sections */
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
    fontWeight: "800",
  },

  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },

  /* Fields Card */
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

  inputWithPrefix: {
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
    height: 50,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.navy,
  },

  currencyText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
  },

  priceInput: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    fontWeight: "600",
  },

  helperRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingHorizontal: 2,
  },

  helperText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
  },

  /* Save */
  saveSection: {
    marginTop: spacing.xs,
  },

  bottomSpace: {
    height: 10,
  },
});
