import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@/constants/theme";

const tabs = [
  { key: "home", title: "Home", icon: "home-outline", activeIcon: "home" },
  { key: "debtors", title: "Debtors", icon: "people-outline", activeIcon: "people" },
  { key: "sell", title: "Sell", icon: "cart-outline", activeIcon: "cart" },
  { key: "inventory", title: "Inventory", icon: "cube-outline", activeIcon: "cube" },
  { key: "reports", title: "Reports", icon: "bar-chart-outline", activeIcon: "bar-chart" },
];

// The bar now takes up its own space in the layout, so screens no longer
// need extra bottom padding to avoid being covered by it.
export const bottomNavHeight = 0;

const BAR_HEIGHT = 76;

export default function BottomNav({ state, navigation }) {
  const currentTab = state.routes[state.index].name;

  return (
    <View style={styles.bottomNav}>
      {tabs.map((item) => {
        const route = state.routes.find((r) => r.name === item.key);
        if (!route) return null;
        const isActive = item.key === currentTab;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isActive && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable key={item.key} style={styles.navItem} onPress={onPress} hitSlop={6}>
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

const styles = StyleSheet.create({
  bottomNav: {
    height: BAR_HEIGHT,
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