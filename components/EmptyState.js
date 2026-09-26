import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@/constants/theme";

export default function EmptyState({ icon, title, subtitle }) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={40} color={colors.border} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl * 1.5,
    gap: spacing.xs,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
});