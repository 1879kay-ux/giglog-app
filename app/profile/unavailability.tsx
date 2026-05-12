import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import {
    addMemberUnavailability,
    deleteMemberUnavailability,
    listMemberUnavailability,
    MemberUnavailability,
} from "@/lib/memberUnavailability";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Stack } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

function toDbDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toDisplayDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(`${date}T12:00:00`) : date;
  return new Intl.DateTimeFormat("en-GB").format(d);
}

export default function UnavailabilityScreen() {
  const cm: any = useCurrentMember();

  const memberId =
    cm?.currentMemberId ??
    cm?.memberId ??
    cm?.currentMember?.member_id ??
    cm?.member?.member_id ??
    null;

  const [items, setItems] = useState<MemberUnavailability[]>([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState<"start" | "end" | null>(null);

  const load = useCallback(async () => {
    if (!memberId) return;

    setLoading(true);

    const { data, error } = await listMemberUnavailability(memberId);

    if (!error && data) setItems(data);

    setLoading(false);
  }, [memberId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd() {
    if (!memberId) return;

    const { error } = await addMemberUnavailability({
      memberId,
      startDate: toDbDate(startDate),
      endDate: toDbDate(endDate),
    });

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    load();
  }

  async function handleDelete(id: string) {
    const { error } = await deleteMemberUnavailability(id);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    load();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Unavailable Periods" }} />

      <View style={styles.container}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
          <Text style={styles.infoText}>
            Add holidays, work commitments, or any dates you cannot gig.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Add unavailable period</Text>

          <Text style={styles.label}>Start Date</Text>
          <Pressable style={styles.dateInput} onPress={() => setShowPicker("start")}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={styles.dateInputText}>{toDisplayDate(startDate)}</Text>
          </Pressable>

          <Text style={styles.label}>End Date</Text>
          <Pressable style={styles.dateInput} onPress={() => setShowPicker("end")}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={styles.dateInputText}>{toDisplayDate(endDate)}</Text>
          </Pressable>

          {showPicker ? (
            <DateTimePicker
              value={showPicker === "start" ? startDate : endDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_, selectedDate) => {
                if (Platform.OS !== "ios") setShowPicker(null);
                if (!selectedDate) return;

                if (showPicker === "start") {
                  setStartDate(selectedDate);
                  if (selectedDate > endDate) setEndDate(selectedDate);
                } else {
                  setEndDate(selectedDate);
                }
              }}
            />
          ) : null}

          {Platform.OS === "ios" && showPicker ? (
            <Pressable style={styles.doneBtn} onPress={() => setShowPicker(null)}>
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          ) : null}

          <Pressable style={styles.addBtn} onPress={handleAdd}>
            <Text style={styles.addBtnText}>Add Unavailability</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Upcoming unavailable periods</Text>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-clear-outline" size={28} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No unavailable periods yet</Text>
              <Text style={styles.emptyText}>Add holidays, work blocks or dates you can’t gig.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View>
                <Text style={styles.dateText}>
                  {toDisplayDate(item.start_date)} → {toDisplayDate(item.end_date)}
                </Text>
                <Text style={styles.cardSubText}>Unavailable</Text>
              </View>

              <Pressable onPress={() => handleDelete(item.id)}>
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          )}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.pageBg,
  },

  infoCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#EFFFFC",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },

  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    lineHeight: 18,
  },

  formCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.text,
    marginBottom: 10,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 10,
    color: colors.text,
  },

  dateInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
  },

  dateInputText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },

  doneBtn: {
    marginTop: 10,
    alignSelf: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  doneBtnText: {
    color: colors.primary,
    fontWeight: "700",
  },

  addBtn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },

  addBtnText: {
    color: "#fff",
    fontWeight: "800",
  },

  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  dateText: {
    fontWeight: "800",
    color: colors.text,
  },

  cardSubText: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "700",
  },

  deleteText: {
    color: "#DC2626",
    fontWeight: "800",
  },

  emptyCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    backgroundColor: colors.cardBg,
  },

  emptyTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "900",
    color: colors.text,
  },

  emptyText: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
});