import { View, Text, StyleSheet } from "react-native";
import Card from "./Card";
import { colors, spacing } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";

export default function StatBox({
  label,
  value,
  icon,
  tone = "navy",
}) {
  return (
    <Card style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: toneBg[tone] }]}>
        <Ionicons name={icon} size={18} color={toneFg[tone]} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </Card>
  );
}

const toneBg = {
  navy: "#1E3A5F1A",
  gold: "#C9A24B26",
  danger: "#B3413B1A",
  success: "#2E7D5B1A",
};

const toneFg = {
  navy: colors.navy,
  gold: colors.gold,
  danger: colors.danger,
  success: colors.success,
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: 6,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.navy,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
});