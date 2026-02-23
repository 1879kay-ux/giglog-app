import { CurrentMemberProvider } from "@/components/auth/CurrentMemberContext";
import { supabase } from "@/lib/supabase";
import { Stack, usePathname, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let alive = true;

    async function check() {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.log("auth getSession error", error);

      const hasSession = !!data?.session;

      if (!alive) return;

      // Allow auth screen without redirect loops
      if (!hasSession && pathname !== "/auth") router.replace("/auth");
      if (hasSession && pathname === "/auth") router.replace("/");

      setBooting(false);
    }

    check();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const hasSession = !!session;

      if (!hasSession && pathname !== "/auth") router.replace("/auth");
      if (hasSession && pathname === "/auth") router.replace("/");

      setBooting(false);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [router, pathname]);

  if (booting) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <CurrentMemberProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#008080" },
          headerTitleStyle: { color: "#fff", fontWeight: "700" },
          headerTintColor: "#fff",
          headerTitleAlign: "center",
        }}
      >
        {/* Tabs app */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Auth */}
        <Stack.Screen name="auth" options={{ title: "Sign in" }} />

        {/* Modals group */}
        <Stack.Screen name="(modals)" options={{ headerShown: false }} />

        {/* Not found */}
        <Stack.Screen name="+not-found" options={{ title: "Not found" }} />
      </Stack>
    </CurrentMemberProvider>
  );
}