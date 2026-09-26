import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/constants/theme";

export default function TopHeader({ title, subtitle, showSettings = true }) {
  const router = useRouter();

  return (
    <View style={styles.topBar}>
      <View style={styles.titleWrap}>
        <Text style={styles.screenTitle}>{title}</Text>
        {subtitle ? <Text style={styles.screenSubtitle}>{subtitle}</Text> : null}
      </View>

      {showSettings ? (
        <Pressable
          style={styles.settingsBtn}
          onPress={() => router.push("/settings")}
          hitSlop={8}
        >
          <Ionicons name="settings" size={28} color={colors.white} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    minHeight: 112,
    backgroundColor: colors.navy,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.md,
  },
  screenTitle: {
    color: colors.white,
    fontSize: 29,
    fontWeight: "800",
  },
  screenSubtitle: {
    color: colors.goldLight,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  settingsBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
});