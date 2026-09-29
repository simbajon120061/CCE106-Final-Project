import { Redirect } from "expo-router";

import { useAuth } from "@/context/AuthContext";

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  return <Redirect href={user ? "/home/dashboard" : "/login"} />;
}
