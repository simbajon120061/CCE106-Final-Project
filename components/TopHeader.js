import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/constants/theme";

export default function TopHeader({
  title,
  subtitle,
  icon,
  showSettings = true,
  showBack = false,
}) {
  const router = useRouter();

  return (
    <View style={styles.topBar}>
      {/* Decorative background circles */}
      <View style={styles.circleLarge} />
      <View style={styles.circleSmall} />

      <View style={styles.content}>
        {showBack ? (
          <Pressable
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </Pressable>
        ) : null}

        {icon ? (
          <View style={styles.iconTile}>
            <Ionicons name={icon} size={26} color={colors.goldLight} />
          </View>
        ) : null}

        <View style={styles.titleWrap}>
          <Text style={styles.screenTitle} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <View style={styles.subtitlePill}>
              <Text style={styles.screenSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
          ) : null}
        </View>

        {showSettings ? (
          <Pressable
            style={styles.settingsBtn}
            onPress={() => router.push("/settings")}
            hitSlop={8}
          >
            <Ionicons name="settings-outline" size={24} color={colors.white} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    backgroundColor: colors.navy,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md + 8,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
    // soft shadow under the banner
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  circleLarge: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    right: -70,
    top: -90,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  circleSmall: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    left: -40,
    bottom: -60,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 88,
  },
  iconTile: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm + 4,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.sm,
  },
  screenTitle: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  subtitlePill: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  screenSubtitle: {
    color: colors.goldLight,
    fontSize: 12,
    fontWeight: "700",
  },
  settingsBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
});
