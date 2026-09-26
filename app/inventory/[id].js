import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import Button from "@/components/Button";
import BottomNav, { bottomNavHeight } from "@/components/BottomNav";
import { colors, spacing, typography, radius } from "@/constants/theme";
import { getProduct, updateProduct, deleteProduct } from "@/db/database";

export default function EditProductScreen() {
  const { id } = useLocalSearchParams();
  const db = useSQLiteContext();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [threshold, setThreshold] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProduct(db, Number(id)).then((p) => {
      if (!p) return;
      setProduct(p);
      setName(p.name);
      setCategory(p.category || "");
      setPrice(String(p.unit_price));
      setStock(String(p.stock_quantity));
      setThreshold(String(p.low_stock_threshold));
    });
  }, [db, id]);

  async function handleSave() {
    if (!name.trim() || !price) {
      Alert.alert("Missing info", "Product name and unit price are required.");
      return;
    }
    setSaving(true);
    try {
      await updateProduct(db, Number(id), {
        name: name.trim(),
        category: category.trim() || null,
        unit_price: Number(price) || 0,
        stock_quantity: Number(stock) || 0,
        low_stock_threshold: Number(threshold) || 0,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert("Remove product", `Remove ${product?.name} from inventory?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteProduct(db, Number(id));
          router.back();
        },
      },
    ]);
  }

  if (!product) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.navy} />
        </Pressable>
        <Text style={styles.title}>Edit product</Text>
        <Pressable onPress={handleDelete} hitSlop={12}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <Field label="Product name *">
          <TextInput value={name} onChangeText={setName} style={styles.input} />
        </Field>
        <Field label="Category">
          <TextInput value={category} onChangeText={setCategory} style={styles.input} />
        </Field>
        <Field label="Unit price (₱) *">
          <TextInput
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </Field>
        <Field label="Stock quantity">
          <View style={styles.stepperRow}>
            <Pressable
              style={styles.stepperBtn}
              onPress={() => setStock(String(Math.max(0, (Number(stock) || 0) - 1)))}
            >
              <Ionicons name="remove" size={18} color={colors.navy} />
            </Pressable>
            <TextInput
              value={stock}
              onChangeText={setStock}
              keyboardType="number-pad"
              style={[styles.input, { flex: 1, textAlign: "center" }]}
            />
            <Pressable
              style={styles.stepperBtn}
              onPress={() => setStock(String((Number(stock) || 0) + 1))}
            >
              <Ionicons name="add" size={18} color={colors.navy} />
            </Pressable>
          </View>
        </Field>
        <Field label="Low stock alert threshold">
          <TextInput
            value={threshold}
            onChangeText={setThreshold}
            keyboardType="number-pad"
            style={styles.input}
          />
        </Field>

        <Button title="Save changes" onPress={handleSave} loading={saving} />
      </ScrollView>
      <BottomNav activeTab="inventory" />
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
  stepperRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
