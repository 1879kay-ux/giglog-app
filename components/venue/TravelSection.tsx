import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  eventId: string;

  venueAddress?: string | null;
  venueCity?: string | null;
  venuePostcode?: string | null;

  // per-event override
  departureAddress?: string | null;
  departurePostcode?: string | null;
};

type AppSettingsRow = {
  default_departure_address: string | null;
  default_departure_postcode: string | null;
};

function enc(s: string) {
  return encodeURIComponent(s.trim());
}

function clean(v?: string | null) {
  const t = (v ?? "").trim();
  return t.length ? t : null;
}

export default function TravelSection({
  eventId,
  venueAddress,
  venueCity,
  venuePostcode,
  departureAddress,
  departurePostcode,
}: Props) {
  const router = useRouter();
  const { isAdmin, adminModeEnabled } = useCurrentMember();
  const canEdit = !!isAdmin && !!adminModeEnabled;

  const goEditEvent = () => router.push(`/events/${eventId}/edit/travel`);
  const goDefaults = () => router.push("/settings/travel" as any);

  const [showWebPicker, setShowWebPicker] = useState(false);

  const onPressEdit = () => {
    if (!canEdit) return;

    if (Platform.OS === "web") {
      setShowWebPicker(true);
      return;
    }

    Alert.alert(
      "Departure location",
      "What do you want to change?",
      [
        { text: "Default for all events", onPress: goDefaults },
        { text: "This event only", onPress: goEditEvent },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true },
    );
  };

  // Shared default (from app_settings)
  const [defaults, setDefaults] = useState<AppSettingsRow>({
    default_departure_address: null,
    default_departure_postcode: null,
  });

  // Refetch defaults whenever this screen regains focus
  useFocusEffect(
    useCallback(() => {
      let alive = true;

      (async () => {
        const { data, error } = await supabase
          .from("app_settings")
          .select("default_departure_address, default_departure_postcode")
          .eq("id", "global")
          .maybeSingle();

        if (!alive) return;

        if (error) {
          console.log("TravelSection app_settings read error:", error);
          return;
        }

        const row = (data as AppSettingsRow) ?? null;
        setDefaults({
          default_departure_address: row?.default_departure_address ?? null,
          default_departure_postcode: row?.default_departure_postcode ?? null,
        });
      })();

      return () => {
        alive = false;
      };
    }, []),
  );

  const venueDest = useMemo(() => {
    return (
      [clean(venueAddress), clean(venueCity), clean(venuePostcode)]
        .filter(Boolean)
        .join(", ") ||
      clean(venuePostcode) ||
      ""
    );
  }, [venueAddress, venueCity, venuePostcode]);

  // effective departure = event override first, otherwise global default
  const effectiveDepartureAddress =
    clean(departureAddress) ??
    clean(defaults.default_departure_address) ??
    null;

  const effectiveDeparturePostcode =
    clean(departurePostcode) ??
    clean(defaults.default_departure_postcode) ??
    null;

  const departureOrigin = useMemo(() => {
    return (
      [effectiveDepartureAddress, effectiveDeparturePostcode]
        .filter(Boolean)
        .join(", ") ||
      effectiveDeparturePostcode ||
      ""
    );
  }, [effectiveDepartureAddress, effectiveDeparturePostcode]);

  async function openUrl(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        "Can't open maps",
        "Check the address/postcode and try again.",
      );
    }
  }

  function openToVenue(app: "apple" | "google" | "waze") {
    if (!venueDest) {
      Alert.alert(
        "Venue location missing",
        "Add an address or postcode to the venue.",
      );
      return;
    }

    const d = enc(venueDest);

    const url =
      app === "apple"
        ? `http://maps.apple.com/?daddr=${d}&dirflg=d`
        : app === "google"
          ? `https://www.google.com/maps/dir/?api=1&destination=${d}&travelmode=driving`
          : `https://waze.com/ul?q=${d}&navigate=yes`;

    openUrl(url);
  }

  function openFromDeparture(app: "apple" | "google") {
    if (!departureOrigin) {
      Alert.alert(
        "Departure location not set",
        "Set a default departure location, or set one just for this event.",
      );
      return;
    }
    if (!venueDest) {
      Alert.alert(
        "Venue location missing",
        "Add an address or postcode to the venue.",
      );
      return;
    }

    const o = enc(departureOrigin);
    const d = enc(venueDest);

    const url =
      app === "apple"
        ? `http://maps.apple.com/?saddr=${o}&daddr=${d}&dirflg=d`
        : `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}&travelmode=driving`;

    openUrl(url);
  }

   function openToDeparture(app: "apple" | "google" | "waze") {
    if (!departureOrigin) {
      Alert.alert(
        "Departure location not set",
        "Set a default departure location, or set one just for this event.",
      );
      return;
    }
    if (!venueDest) {
      Alert.alert(
        "Venue location missing",
        "Add an address or postcode to the venue.",
      );
      return;
    }

    const o = enc(venueDest);
    const d = enc(departureOrigin);

    const url =
      app === "apple"
        ? `http://maps.apple.com/?saddr=${o}&daddr=${d}&dirflg=d`
        : app === "google"
          ? `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}&travelmode=driving`
          : `https://waze.com/ul?q=${d}&navigate=yes`;

    openUrl(url);
  }

  const showingGlobalDefault =
    !clean(departureAddress) &&
    !clean(departurePostcode) &&
    (!!effectiveDepartureAddress || !!effectiveDeparturePostcode);

  return (
    <View style={styles.wrap}>
      {/* Departure */}
      <View style={styles.travelRow}>
        <View style={styles.blockHeader}>
          <Text style={styles.travelLabel}>Departure Location → Venue</Text>

          {canEdit ? (
            <Pressable
              onPress={onPressEdit}
              hitSlop={10}
              style={styles.editPill}
            >
              <Ionicons
                name="create-outline"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.editPillText}>Edit</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.travelButtonRow}>
          <Chip label="Apple" onPress={() => openFromDeparture("apple")} />
          <Chip label="Google" onPress={() => openFromDeparture("google")} />
          {/* Waze removed here: Waze deep links route from current location only */}
        </View>

        <View style={styles.locationBox}>
          <View style={styles.locationHeaderRow}>
            <Text style={styles.locationTitle}>Departure Location</Text>

            {showingGlobalDefault ? (
              <Pressable
                onPress={canEdit ? goDefaults : undefined}
                style={styles.badge}
                hitSlop={8}
                disabled={!canEdit}
              >
                <Text style={styles.badgeText}>Default</Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.locationText}>
            {effectiveDepartureAddress ?? "Not set"}
          </Text>
          <Text style={styles.locationText}>
            {effectiveDeparturePostcode ?? ""}
          </Text>
        </View>
      </View>

      {/* Current location */}
      <View style={styles.travelRow}>
        <Text style={styles.travelLabel}>Current Location → Venue</Text>

        <View style={styles.travelButtonRow}>
          <Chip label="Apple" onPress={() => openToVenue("apple")} />
          <Chip label="Google" onPress={() => openToVenue("google")} />
          <Chip label="Waze" onPress={() => openToVenue("waze")} />
        </View>
      </View>
      {/* Venue */}
      <View style={styles.locationBox}>
        <Text style={styles.locationTitle}>Venue Location</Text>
        <Text style={styles.locationText}>{venueAddress ?? ""}</Text>
        <Text style={styles.locationText}>
          {venueCity ?? ""} {venuePostcode ?? ""}
        </Text>
      </View>
      {/* Venue → Departure */}
      <View style={styles.travelRow}>
        <Text style={styles.travelLabel}>Venue → Departure Location</Text>

        <View style={styles.travelButtonRow}>
          <Chip label="Apple" onPress={() => openToDeparture("apple")} />
          <Chip label="Google" onPress={() => openToDeparture("google")} />
          <Chip label="Waze" onPress={() => openToDeparture("waze")} />
        </View>
      </View>
      {/* WEB PICKER MODAL (admin + admin mode) */}
      {Platform.OS === "web" && showWebPicker && canEdit ? (
        <View style={styles.webModalOverlay} pointerEvents="auto">
          <View style={styles.webModalCard} pointerEvents="auto">
            <Text style={styles.webModalTitle}>Departure location</Text>
            <Text style={styles.webModalText}>What do you want to change?</Text>

            <Pressable
              style={styles.webModalBtn}
              onPress={() => {
                setShowWebPicker(false);
                router.push("/settings/travel" as any);
              }}
            >
              <Text style={styles.webModalBtnText}>Default for all events</Text>
            </Pressable>

            <Pressable
              style={styles.webModalBtn}
              onPress={() => {
                setShowWebPicker(false);
                goEditEvent();
              }}
            >
              <Text style={styles.webModalBtnText}>This event only</Text>
            </Pressable>

            <Pressable
              style={[styles.webModalBtn, styles.webModalBtnCancel]}
              onPress={() => setShowWebPicker(false)}
            >
              <Text style={styles.webModalBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.chip}
      android_ripple={{ color: "#d9f0f0" }}
    >
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 4, position: "relative" },

  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  // ✅ fixed to match other sections
  editPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(13,148,136,0.10)",
  },
  editPillText: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.primary,
  },

  travelRow: { marginBottom: 14 },

  travelLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111",
  },

  travelButtonRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },

  chip: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primaryDark,
  },

  chipText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },

  locationBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#f7f7f7",
    borderRadius: 10,
  },

  locationHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  locationTitle: { fontSize: 12, fontWeight: "900", color: "#333" },

  badge: {
    backgroundColor: "#E9F6F6",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  badgeText: { color: colors.primary, fontSize: 11, fontWeight: "900" },

  locationText: { fontSize: 13, color: "#555" },

  webModalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    zIndex: 9999,
    pointerEvents: "auto",
  },

  webModalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },

  webModalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111",
    marginBottom: 6,
  },

  webModalText: { fontSize: 13, color: "#444", marginBottom: 12 },

  webModalBtn: {
    backgroundColor: "#E9F6F6",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 8,
  },

  webModalBtnCancel: { backgroundColor: "#f2f2f2" },

  webModalBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
});
