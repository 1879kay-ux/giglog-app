import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function ModalsLayout() {
  const { t } = useTranslation();

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
          title: t("addVenue.title"),
        }}
      />
    </Stack>
  );
}
