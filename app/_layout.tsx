import { CurrentMemberProvider } from "@/components/auth/CurrentMemberContext";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import * as Notifications from "expo-notifications";
import { Stack, usePathname, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowAlert: true,
  }),
});

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        console.log("Notification tapped data:", data);

        const eventId = data?.event_id;

        if (typeof eventId === "string" && eventId.length > 0) {
          router.push({
            pathname: `/events/${eventId}`,
            params:
              data?.open === "availability" ? { open: "availability" } : {},
          });
        }
      },
    );

    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    let alive = true;

    const isAuthRoute = pathname === "/auth" || pathname === "/auth/callback";

    async function check() {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.log("auth getSession error", error);

      const hasSession = !!data?.session;

      if (!alive) return;

      if (!hasSession && !isAuthRoute) router.replace("/auth");
      if (hasSession && pathname === "/auth") router.replace("/");

      setBooting(false);
    }

    check();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const hasSession = !!session;

      if (!hasSession && !isAuthRoute) router.replace("/auth");
      if (hasSession && pathname === "/auth") router.replace("/");

      setBooting(false);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
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
          headerStyle: { backgroundColor: colors.primary },
          headerTitleStyle: { color: "#fff", fontWeight: "700" },
          headerTintColor: "#fff",
          headerTitleAlign: "center",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ title: "Sign in" }} />
        <Stack.Screen name="(modals)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ title: "Not found" }} />
      </Stack>
    </CurrentMemberProvider>
  );
}
