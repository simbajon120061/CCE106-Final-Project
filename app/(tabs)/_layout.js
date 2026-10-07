import { Tabs } from "expo-router";
import BottomNav from "@/components/BottomNav";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="debtors" />
      <Tabs.Screen name="sell" />
      <Tabs.Screen name="inventory" />
      <Tabs.Screen name="reports" />
    </Tabs>
  );
}