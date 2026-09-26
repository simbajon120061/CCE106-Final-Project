import { View, Text, Pressable, StyleSheet } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@/constants/theme";

const tabs = [
  { key: "home", title: "Home", icon: "home-outline", activeIcon: "home", route: "/home/dashboard" },
  { key: "debtors", title: "Debtors", icon: "people-outline", activeIcon: "people", route: "/debtors" },
  { key: "sell", title: "Sell", icon: "cart-outline", activeIcon: "cart", route: "/sell" },
  { key: "inventory", title: "Inventory", icon: "cube-outline", activeIcon: "cube", route: "/inventory" },
  { key: "reports", title: "Reports", icon: "bar-chart-outline", activeIcon: "bar-chart", route: "/reports" },
];

export const bottomNavHeight = 76;

export default function BottomNav({ activeTab }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentTab = getActiveTab(pathname) || activeTab;

  return (
    <View style={styles.bottomNav}>
      {tabs.map((item) => {
        const isActive = item.key === currentTab;

        return (
          <Pressable
            key={item.key}
            style={styles.navItem}
            onPress={() => router.replace(item.route)}
            hitSlop={6}
          >
            <Ionicons
              name={isActive ? item.activeIcon : item.icon}
              size={item.key === "home" ? 25 : 24}
              color={isActive ? colors.navy : colors.textMuted}
            />
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
              {item.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function getActiveTab(pathname) {
  if (pathname.startsWith("/debtors")) return "debtors";
  if (pathname.startsWith("/sell")) return "sell";
  if (pathname.startsWith("/inventory") || pathname.startsWith("/products")) return "inventory";
  if (pathname.startsWith("/reports")) return "reports";
  if (pathname.startsWith("/home")) return "home";
  return "settings";
}

const styles = StyleSheet.create({
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: bottomNavHeight,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
  },
  navLabelActive: {
    color: colors.navy,
  },
});
