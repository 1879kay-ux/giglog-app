import { createClient } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";

import VenueForm from "../../components/venue/VenueForm";
import { Venue } from "../../types/venue";

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AddVenueScreen() {
  console.log("🟣 AddVenueScreen mounted");   // ✔️ Correct placement

  const router = useRouter();

  const handleSubmit = async (venue: Venue) => {
    console.log("🔥 handleSubmit fired with venue:", venue);

    try {
      console.log("📤 Attempting to save venue:", venue);

      const { data, error } = await supabase
        .from("venues")
        .insert(venue)
        .select()
        .single();

      if (error) {
        console.log("❌ SUPABASE ERROR:", error);
        Alert.alert("Save Failed", error.message);
        return;
      }

      console.log("✅ SUPABASE INSERT RESULT:", data);

      Alert.alert("Success", "Venue added successfully");
      router.back();
    } catch (err: any) {
      console.log("❌ SUPABASE ERROR:", err);
      Alert.alert(
        "Save Failed",
        err?.message ?? "Unable to save venue to Supabase"
      );
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.container}>
        <VenueForm onSubmit={handleSubmit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});