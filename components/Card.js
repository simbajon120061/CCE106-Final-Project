import { View, StyleSheet } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";

export default function Card({ style, ...props }) {
  return <View style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});