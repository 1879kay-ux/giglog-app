import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import VenueForm from "@/components/venue/VenueForm";
import { supabase } from "@/lib/supabase";
import type { Venue } from "@/types/venue";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, View } from "react-native";

export default function EditVenueScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isAdmin, loading: memberLoading } = useCurrentMember();

  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [loading, setLoading] = useState(true);
  const [initialValues, setInitialValues] = useState<Partial<Venue> | null>(
    null,
  );

  useEffect(() => {
    if (memberLoading) return;

    if (!isAdmin) {
      Alert.alert("No access", "Only admins can edit venues.");
      router.back();
    }
  }, [isAdmin, memberLoading, router]);

  useEffect(() => {
    if (memberLoading) return;
    if (!isAdmin) return;
    if (!id) return;

    loadVenue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isAdmin, memberLoading]);

  async function loadVenue() {
    if (!id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("venues")
      .select("*")
      .eq("venue_id", id)
      .single();

    if (error) {
      Alert.alert("Error", error.message);
      setLoading(false);
      return;
    }

    setInitialValues(data as Venue);
    setLoading(false);
  }

  async function handleSubmit(updated: Venue) {
    if (!id) return;

    const { error } = await supabase
      .from("venues")
      .update({
        event_venue_name: updated.event_venue_name,
        address: updated.address ?? null,
        city: updated.city,
        postcode: updated.postcode ?? null,
        venue_contact_name: updated.venue_contact_name ?? null,
        venue_contact_phone: updated.venue_contact_phone ?? null,
        venue_contact_email: updated.venue_contact_email ?? null,
        venue_notes: updated.venue_notes ?? null,
        is_active: updated.is_active ?? true,
        capacity: updated.capacity ?? null,
        capacity_notes: updated.capacity_notes ?? null,
      })
      .eq("venue_id", id);

    if (error) {
      Alert.alert("Save failed", error.message);
      return;
    }

    router.replace(`/venue/${id}`);
  }

  if (memberLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#333" />
      </View>
    );
  }

  if (!isAdmin) return null;

  if (loading || !initialValues) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Stack.Screen options={{ title: t("addVenue.editTitle") }} />
        <ActivityIndicator size="large" color="#333" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t("addVenue.editTitle") }} />
      <VenueForm
        key={id}
        initialValues={initialValues}
        onSubmit={handleSubmit}
      />
    </>
  );
}
