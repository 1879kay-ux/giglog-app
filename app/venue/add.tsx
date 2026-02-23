import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";

import VenueForm from "../../components/venue/VenueForm";
import { Venue } from "../../types/venue";

export default function AddVenueScreen() {
  console.log("🟣 AddVenueScreen mounted");

  const router = useRouter();
  const { isAdmin, loading } = useCurrentMember();

  useEffect(() => {
    if (loading) return;

    if (!isAdmin) {
      Alert.alert("No access", "Only admins can add venues.");
      router.back();
    }
  }, [isAdmin, loading, router]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#333" />
      </View>
    );
  }

  // If not admin, we trigger router.back() above.
  // Return null to avoid flashing the form.
  if (!isAdmin) return null;

  const handleSubmit = async (venue: Venue) => {
    console.log("🔥 handleSubmit fired with venue:", venue);

    try {
      // Build payload WITHOUT venue_id so DB can generate it
      const payload = {
        event_venue_name: venue.event_venue_name?.trim(),
        city: venue.city?.trim(),
        address: venue.address?.trim() || null,
        postcode: venue.postcode?.trim() || null,
        venue_contact_name: venue.venue_contact_name?.trim() || null,
        venue_contact_phone: venue.venue_contact_phone?.trim() || null,
        venue_contact_email: venue.venue_contact_email?.trim() || null,
        venue_notes: venue.venue_notes?.trim() || null,
        is_active: venue.is_active ?? true,
        capacity: venue.capacity ?? null,
        capacity_notes: venue.capacity_notes?.trim() || null,
      };

      const { data, error } = await supabase.from("venues").insert(payload).select().single();

      if (error) {
        console.log("❌ SUPABASE ERROR:", error);
        Alert.alert("Save Failed", error.message);
        return;
      }

      console.log("✅ SUPABASE INSERT RESULT:", data);
      Alert.alert("Success", "Venue added successfully");
      router.back();
    } catch (err: any) {
      console.log("❌ UNEXPECTED ERROR:", err);
      Alert.alert("Save Failed", err?.message ?? "Unable to save venue");
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
  container: { flex: 1 },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});