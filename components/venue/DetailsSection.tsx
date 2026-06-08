import InfoCard from "@/components/InfoCard";
import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type VenueRow = {
  event_venue_name: string | null;
  address: string | null;
  city: string | null;
  postcode: string | null;
  venue_contact_name: string | null;
  venue_contact_phone: string | null;
  venue_contact_email: string | null;
  capacity: number | null;
  venue_notes: string | null;
};

type EventRow = {
  event_date: string | null;
  event_type: string | null;
  event_status: string | null;

  promoter_contact_name: string | null;
  promoter_contact_phone: string | null;
  promoter_contact_email: string | null;

  // ✅ add notes
  event_notes: string | null;
};

type DetailsSectionProps = {
  eventId: string;
  event: EventRow; // event is ALWAYS defined
  venue: VenueRow | null; // venue may be null
  venueId?: string | null; // optional, only if you want edit-venue shortcut
};

export default function DetailsSection({
  eventId,
  event,
  venue,
  venueId,
}: DetailsSectionProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAdmin, adminModeEnabled } = useCurrentMember();
  const canEdit = isAdmin && adminModeEnabled;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-GB", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const editPill = (onPress: () => void) => (
    <Pressable onPress={onPress} hitSlop={10} style={styles.editPill}>
      <Ionicons name="create-outline" size={16} color={colors.primary} />
      <Text style={styles.editPillText}>{t("detailsSection.edit")}</Text>
    </Pressable>
  );

  const editEventDetails = canEdit
    ? editPill(() => router.push(`/events/${eventId}/edit/details`))
    : undefined;

  const editVenueDetails =
    canEdit && venueId
      ? editPill(() =>
          router.push({
            pathname: "/venue/[id]/edit",
            params: { id: venueId },
          }),
        )
      : undefined;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Event Overview */}
        <InfoCard title={t("detailsSection.eventOverview")} right={editEventDetails}>
          <View style={styles.row}>
            <Text style={styles.label}>{t("detailsSection.date")}</Text>
            <Text style={styles.value}>{formatDate(event.event_date)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{t("detailsSection.eventName")}</Text>
            <Text style={styles.value}>{venue?.event_venue_name || "—"}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{t("detailsSection.city")}</Text>
            <Text style={styles.value}>{venue?.city || "—"}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{t("detailsSection.status")}</Text>
            <Text style={styles.value}>{event.event_status || "—"}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{t("detailsSection.type")}</Text>
            <Text style={styles.value}>{event.event_type || "—"}</Text>
          </View>

          {/* ✅ Notes */}
          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.label}>{t("detailsSection.eventNotes")}</Text>
            <Text style={styles.value}>{event.event_notes || "—"}</Text>
          </View>
        </InfoCard>

        {/* Venue Details */}
        <InfoCard title={t("detailsSection.venueDetails")} right={editVenueDetails}>
          <View style={styles.row}>
            <Text style={styles.label}>{t("detailsSection.venueName")}</Text>
            <Text style={styles.value}>{venue?.event_venue_name || "—"}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{t("detailsSection.address")}</Text>
            <Text style={styles.value}>
              {venue?.address || "—"}
              {venue?.postcode ? ` ${venue.postcode}` : ""}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{t("detailsSection.contactName")}</Text>
            <Text style={styles.value}>{venue?.venue_contact_name || "—"}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{t("detailsSection.contactPhone")}</Text>
            <Text style={styles.value}>
              {venue?.venue_contact_phone || "—"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{t("detailsSection.contactEmail")}</Text>
            <Text style={styles.value}>
              {venue?.venue_contact_email || "—"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{t("detailsSection.capacity")}</Text>
            <Text style={styles.value}>{venue?.capacity ?? "—"}</Text>
          </View>

          {venue?.venue_notes ? (
            <View style={[styles.row, styles.rowLast]}>
              <Text style={styles.label}>{t("detailsSection.venueNotes")}</Text>
              <Text style={styles.value}>{venue.venue_notes}</Text>
            </View>
          ) : (
            <View style={[styles.row, styles.rowLast]}>
              <Text style={styles.label}>{t("detailsSection.venueNotes")}</Text>
              <Text style={styles.value}>—</Text>
            </View>
          )}
        </InfoCard>

        {/* Promoter Contact */}
        <InfoCard title={t("detailsSection.promoterContact")} right={editEventDetails}>
          <View style={styles.row}>
            <Text style={styles.label}>{t("detailsSection.name")}</Text>
            <Text style={styles.value}>
              {event.promoter_contact_name || "—"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>{t("detailsSection.phone")}</Text>
            <Text style={styles.value}>
              {event.promoter_contact_phone || "—"}
            </Text>
          </View>

          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.label}>{t("detailsSection.email")}</Text>
            <Text style={styles.value}>
              {event.promoter_contact_email || "—"}
            </Text>
          </View>
        </InfoCard>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },

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

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  rowLast: {
    borderBottomWidth: 0,
  },

  rowNoBorder: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    width: 110,
  },
  value: {
    fontSize: 14,
    color: "#333",
    flex: 1,
    textAlign: "right",
  },
});
