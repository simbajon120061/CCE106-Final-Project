import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { PRODUCT_UNITS, formatProductUnit } from "@/constants/productUnits";
import { colors, radius, spacing } from "@/constants/theme";

export default function UnitDropdown({ value, onChange }) {
  const [visible, setVisible] = require("react").useState(false);

  function selectUnit(unit) {
    onChange(unit);
    setVisible(false);
  }

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        style={({ pressed }) => [
          styles.trigger,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.triggerText}>{formatProductUnit(value)}</Text>
        <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={styles.menu}>
            <Text style={styles.title}>Unit of measurement</Text>
            {PRODUCT_UNITS.map((unit) => (
              <Pressable
                key={unit}
                onPress={() => selectUnit(unit)}
                style={({ pressed }) => [
                  styles.option,
                  unit === value && styles.optionSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.optionText}>{unit}</Text>
                {unit === value ? (
                  <Ionicons name="checkmark" size={20} color={colors.success} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 50,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.cream,
  },
  triggerText: { color: colors.text, fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.72 },
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  menu: {
    padding: spacing.md,
    gap: 6,
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  title: { color: colors.navy, fontSize: 16, fontWeight: "800", marginBottom: 4 },
  option: {
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radius.sm,
  },
  optionSelected: { backgroundColor: "rgba(217,169,40,0.12)" },
  optionText: { color: colors.navy, fontSize: 14, fontWeight: "700" },
});
