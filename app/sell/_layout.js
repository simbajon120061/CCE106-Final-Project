import { Stack } from "expo-router";

export default function SellLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="checkout" options={{ presentation: "modal" }} />
    </Stack>
  );
}
