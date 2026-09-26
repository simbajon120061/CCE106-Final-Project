import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import Button from "@/components/Button";
import BottomNav, { bottomNavHeight } from "@/components/BottomNav";
import { colors, spacing, typography, radius } from "@/constants/theme";
import { createProduct } from "@/db/database";

export default function NewProductScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [threshold, setThreshold] = useState("5");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim() || !price) {
      Alert.alert("Missing info", "Product name and unit price are required.");
      return;
    }
    setSaving(true);
    try {
      await createProduct(db, {
        name: name.trim(),
        category: category.trim() || null,
        unit_price: Number(price) || 0,
        stock_quantity: Number(stock) || 0,
        low_stock_threshold: Number(threshold) || 5,
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
        <Text style={styles.title}>New product</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <Field label="Product name *">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Lucky Me Pancit Canton"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </Field>
        <Field label="Category">
          <TextInput
            value={category}
            onChangeText={setCategory}
            placeholder="e.g. Noodles, Canned goods, Load"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </Field>
        <Field label="Unit price (₱) *">
          <TextInput
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </Field>
        <Field label="Starting stock quantity">
          <TextInput
            value={stock}
            onChangeText={setStock}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </Field>
        <Field label="Low stock alert threshold">
          <TextInput
            value={threshold}
            onChangeText={setThreshold}
            keyboardType="number-pad"
            style={styles.input}
          />
        </Field>

        <Button title="Save product" onPress={handleSave} loading={saving} />
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
});
