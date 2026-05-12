import { Stack } from "expo-router";

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: "modal",
        headerStyle: { backgroundColor: "colors.primary" },
        headerTintColor: "#fff",
        headerTitleAlign: "center",
      }}
    >
      <Stack.Screen
        name="add"
        options={{
          title: "Add Venue",
        }}
      />
    </Stack>
  );
}
