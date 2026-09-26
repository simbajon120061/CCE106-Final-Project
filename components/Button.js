import { Pressable, Text, StyleSheet, ActivityIndicator, View } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";

export default function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.white : colors.navy} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.text, textStyles[variant]]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.sm,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  text: {
    fontSize: 15,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.navy },
  secondary: { backgroundColor: colors.goldLight },
  danger: { backgroundColor: colors.danger },
  ghost: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border },
});

const textStyles = StyleSheet.create({
  primary: { color: colors.white },
  secondary: { color: colors.navyDark },
  danger: { color: colors.white },
  ghost: { color: colors.navy },
});