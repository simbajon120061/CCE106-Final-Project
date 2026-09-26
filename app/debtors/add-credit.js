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
import { colors, spacing, typography, radius } from "@/constants/theme";
import { formatCurrency } from "@/lib/format";
import { addCreditTransaction, getProducts } from "@/db/database";

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
      setAmount(calculateProductAmount(selectedProduct, nextQuantity));
    }
  }

  async function handleSave() {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      Alert.alert("Invalid amount", "Enter an amount greater than zero.");
      return;
    }
    setSaving(true);
    try {
      await addCreditTransaction(db, {
        debtorId: Number(debtorId),
        amount: amt,
        description: description.trim() || selectedProduct?.name || null,
        productId: selectedProduct?.id ?? null,
        quantity: selectedProduct ? Number(quantity) || 1 : null,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.navy} />
        </Pressable>
        <Text style={styles.title}>Log credit sale</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <Field label="Link a product (optional)">
          <Pressable style={styles.productPicker} onPress={() => setPickerOpen((v) => !v)}>
            <Text style={selectedProduct ? styles.productText : styles.productPlaceholder}>
              {selectedProduct
                ? `${selectedProduct.name} · ${formatCurrency(selectedProduct.unit_price)}`
                : "Select from inventory"}
            </Text>
            <Ionicons name={pickerOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
          </Pressable>
          {pickerOpen && (
            <View style={styles.dropdown}>
              {products.length === 0 ? (
                <Text style={styles.emptyProducts}>No inventory items yet.</Text>
              ) : (
                <FlatList
                  data={products}
                  keyExtractor={(p) => String(p.id)}
                  style={{ maxHeight: 220 }}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.dropdownRow}
                      onPress={() => handleSelectProduct(item)}
                    >
                      <Text style={styles.dropdownName}>{item.name}</Text>
                      <Text style={styles.dropdownPrice}>{formatCurrency(item.unit_price)}</Text>
                    </Pressable>
                  )}
                />
              )}
              {selectedProduct && (
                <Pressable
                  style={styles.dropdownRow}
                  onPress={() => {
                    setSelectedProduct(null);
                    setAmount("");
                    setPickerOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownName, { color: colors.danger }]}>
                    Clear selection
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </Field>

        {selectedProduct && (
          <Field label="Quantity">
            <TextInput
              value={quantity}
              onChangeText={handleQuantityChange}
              keyboardType="number-pad"
              style={styles.input}
            />
          </Field>
        )}

        <Field label="Amount (₱) *">
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </Field>

        <Field label="Description">
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Rice, canned goods, load"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </Field>

        <Button title="Save credit sale" onPress={handleSave} loading={saving} />
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
  safe: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: { ...typography.heading },
  form: { padding: spacing.md, gap: spacing.md, paddingBottom: bottomNavHeight + spacing.xl },
  label: { ...typography.label },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  productPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  productText: { fontSize: 15, color: colors.text },
  productPlaceholder: { fontSize: 15, color: colors.textMuted },
  dropdown: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    marginTop: 6,
    overflow: "hidden",
  },
  dropdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownName: { fontSize: 14, color: colors.text, fontWeight: "600" },
  dropdownPrice: { fontSize: 13, color: colors.textMuted },
  emptyProducts: { padding: spacing.md, color: colors.textMuted, fontSize: 13 },
});
