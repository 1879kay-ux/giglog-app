import InfoCard from "@/components/InfoCard";
import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type ScheduleSectionProps = {
  eventId: string;

  callTime?: string | null;
  loadin?: string | null;
  soundcheck?: string | null;
  doors?: string | null;
  onstage?: string | null;
  offstage?: string | null;
  venueCurfew?: string | null;

  travelVenue?: string | null;
  departVenue?: string | null;

  scheduleNotes?: string | null;
};

function formatTime(value?: string | null) {
  if (!value) return null;

  const m = String(value)
    .trim()
    .match(/^(\d{1,2}):(\d{2})/);
  if (!m) return String(value).trim();
  const hh = m[1].padStart(2, "0");
  const mm = m[2];
  return `${hh}:${mm}`;
}

export default function ScheduleSection({
  eventId,
  callTime,
  loadin,
  soundcheck,
  doors,
  onstage,
  offstage,
  venueCurfew,
  travelVenue,
  departVenue,
  scheduleNotes,
}: ScheduleSectionProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAdmin, adminModeEnabled } = useCurrentMember();
  const canEdit = !!isAdmin && !!adminModeEnabled;

  const editSchedule = canEdit ? (
    <Pressable
      onPress={() => router.push(`/events/${eventId}/edit/schedule`)}
      hitSlop={10}
      style={styles.editPill}
    >
      <Ionicons name="create-outline" size={16} color={colors.primary} />
      <Text style={styles.editPillText}>{t("scheduleSection.edit")}</Text>
    </Pressable>
  ) : undefined;

  const timeFields = [
    { label: t("scheduleSection.travelToVenue"), value: travelVenue ?? callTime },
    { label: t("scheduleSection.loadIn"), value: loadin },
    { label: t("scheduleSection.soundcheck"), value: soundcheck },
    { label: t("scheduleSection.doors"), value: doors },
    { label: t("scheduleSection.onstage"), value: onstage },
    { label: t("scheduleSection.offstage"), value: offstage },
    { label: t("scheduleSection.venueCurfew"), value: venueCurfew },
    { label: t("scheduleSection.departVenue"), value: departVenue },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <InfoCard title={t("scheduleSection.schedule")} right={editSchedule}>
          {timeFields.map((field, index) => {
            const display = formatTime(field.value) ?? "—";
            const isLast = index === timeFields.length - 1;

            return (
              <View
                key={field.label}
                style={[styles.timeRow, isLast && styles.timeRowLast]}
              >
                <Text style={styles.label}>{field.label}</Text>
                <Text style={styles.value}>{display}</Text>
              </View>
            );
          })}

          <View style={styles.notesWrap}>
            <Text style={styles.notesLabel}>{t("scheduleSection.scheduleNotes")}</Text>
            <Text style={styles.notesText}>
              {scheduleNotes && scheduleNotes.trim()
                ? scheduleNotes.trim()
                : "—"}
            </Text>
          </View>
        </InfoCard>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },

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

  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  timeRowLast: {
    borderBottomWidth: 0,
  },
  label: { fontSize: 14, fontWeight: "600", color: "#666" },
  value: { fontSize: 14, color: "#333" },

  notesWrap: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#666",
    marginBottom: 6,
  },
  notesText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
});
