import { Stack } from "expo-router";

export default function DebtorsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="new" options={{ presentation: "modal" }} />
      <Stack.Screen name="edit" options={{ presentation: "modal" }} />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="add-credit" options={{ presentation: "modal" }} />
      <Stack.Screen name="add-payment" options={{ presentation: "modal" }} />
    </Stack>
  );
}
