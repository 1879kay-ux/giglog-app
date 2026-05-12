// app/(tabs)/_layout.tsx

import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTitleStyle: { color: "#fff", fontWeight: "700" },
        headerTintColor: "#fff",
        tabBarActiveTintColor: colors.primary,
      }}
    >
      {/* These MUST match files that exist in app/(tabs)/ */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="two"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
