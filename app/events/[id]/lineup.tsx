import InfoCard from "@/components/InfoCard";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type MemberType = "musician" | "crew";

type BandMemberRow = {
  member_id: string;
  display_name: string | null;
  member_type: MemberType | null;
  band_role: string | null;
  band_role_other: string | null;
  band_positions: string[] | null;
  band_positions_other: string[] | null;
  is_active: boolean | null;
  is_dep: boolean | null;
};

type EventRow = {
  event_id: string;
  band_id: string;
};

export default function EventLineupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const eventId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [loading, setLoading] = useState(true);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);

  const [event, setEvent] = useState<EventRow | null>(null);
  const [members, setMembers] = useState<BandMemberRow[]>([]);
  // IMPORTANT: this is "who is currently on the event"
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());

  const musicians = useMemo(
    () => members.filter((m) => m.member_type === "musician"),
    [members]
  );
  const crew = useMemo(
    () => members.filter((m) => m.member_type === "crew"),
    [members]
  );

  const roleDisplay = (m: BandMemberRow) => {
    if ((m.band_role ?? "") === "Other") return m.band_role_other ?? "Other";
    return m.band_role ?? "";
  };

  const instrumentsDisplay = (m: BandMemberRow) => {
    const preset = m.band_positions ?? [];
    const custom = m.band_positions_other ?? [];
    return [...preset, ...custom].filter(Boolean).join(", ");
  };

  // Core band definition (your rule)
  const isCore = (m: BandMemberRow) =>
    m.is_active === true &&
    m.is_dep === false &&
    m.member_type === "musician" &&
    m.band_role === "Band";

  async function load() {
    if (!eventId) return;
    setLoading(true);

    const { data: ev, error: evErr } = await supabase
      .from("events")
      .select("event_id, band_id")
      .eq("event_id", eventId)
      .single();

    if (evErr) {
      setLoading(false);
      Alert.alert("Error", evErr.message);
      return;
    }

    setEvent(ev as EventRow);

    // 1) Who is on this event is defined by event_availability rows
    const { data: avRows, error: avErr } = await supabase
      .from("event_availability")
      .select("member_id")
      .eq("event_id", eventId);

    if (avErr) {
      setLoading(false);
      Alert.alert("Error", avErr.message);
      return;
    }

    setInvitedIds(new Set<string>((avRows ?? []).map((x: any) => x.member_id)));

    // 2) List of members you can invite comes from band_members
    // Keep it simple: show ACTIVE members (musicians + crew)
    const { data: bm, error: bmErr } = await supabase
      .from("band_members")
      .select(
        `
        member_id,
        display_name,
        member_type,
        band_role,
        band_role_other,
        band_positions,
        band_positions_other,
        is_active,
        is_dep
      `
      )
      .eq("band_id", (ev as EventRow).band_id)
      .eq("is_active", true)
      .order("display_name", { ascending: true });

    if (bmErr) {
      setLoading(false);
      Alert.alert("Error", bmErr.message);
      return;
    }

    setMembers((bm as BandMemberRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function invite(memberId: string) {
    if (!eventId) return;

    setSavingMemberId(memberId);
    try {
      // Source of truth: add them to the event by ensuring availability row exists.
      // status = null means "awaiting"
      const { error } = await supabase
        .from("event_availability")
        .upsert(
          { event_id: eventId, member_id: memberId, status: null },
          { onConflict: "event_id,member_id" }
        );

      if (error) throw error;

      await load();
    } catch (e: any) {
      console.log("invite error", e);
      Alert.alert("Error", e?.message ?? "Failed to add member to event");
    } finally {
      setSavingMemberId(null);
    }
  }

  async function removeInvite(memberId: string) {
    if (!eventId) return;

    const memberName =
      members.find((m) => m.member_id === memberId)?.display_name ?? "this member";

    let confirmed = false;
    if (Platform.OS === "web") {
      confirmed = window.confirm(
        `Remove from event?\n\n${memberName} will be removed from this event and their availability will be deleted.`
      );
    } else {
      confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          "Remove from event?",
          `${memberName} will be removed from this event and their availability will be deleted.`,
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            { text: "Remove", style: "destructive", onPress: () => resolve(true) },
          ]
        );
      });
    }

    if (!confirmed) return;

    setSavingMemberId(memberId);
    try {
      // Core members should not be removable here (optional hard guard)
      const bm = members.find((m) => m.member_id === memberId) ?? null;
      if (bm && isCore(bm)) {
        throw new Error("Core band members cannot be removed from the event.");
      }

      const { data: deletedAvail, error: avErr } = await supabase
        .from("event_availability")
        .delete()
        .eq("event_id", eventId)
        .eq("member_id", memberId)
        .select("event_id");

      if (avErr) throw avErr;
      if (!deletedAvail || deletedAvail.length === 0) {
        throw new Error("Availability row was not deleted (likely blocked by RLS).");
      }

      await load();
    } catch (e: any) {
      console.log("removeInvite error", e);
      Alert.alert("Error", e?.message ?? "Failed to remove member from event");
    } finally {
      setSavingMemberId(null);
    }
  }

  if (!eventId) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Missing event id.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const actionButton = (m: BandMemberRow) => {
    const already = invitedIds.has(m.member_id);
    const saving = savingMemberId === m.member_id;
    const core = isCore(m);

    if (core && already) {
      return (
        <View style={[styles.button, styles.buttonDisabled]}>
          <Text style={styles.buttonText}>Core</Text>
        </View>
      );
    }

    if (already) {
      return (
        <Pressable
          onPress={() => removeInvite(m.member_id)}
          disabled={saving}
          style={[styles.button, styles.removeButton, saving ? styles.buttonDisabled : null]}
        >
          <Text style={[styles.buttonText, styles.removeButtonText]}>
            {saving ? "Removing..." : "Remove"}
          </Text>
        </Pressable>
      );
    }

    return (
      <Pressable
        onPress={() => invite(m.member_id)}
        disabled={saving}
        style={[styles.button, saving ? styles.buttonDisabled : null]}
      >
        <Text style={styles.buttonText}>{saving ? "Adding..." : "Invite"}</Text>
      </Pressable>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Edit Lineup",
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10} style={{ paddingHorizontal: 8 }}>
              <Ionicons name="arrow-back-outline" size={24} color="#fff" />
            </Pressable>
          ),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <InfoCard title="Invite Members">
          <Text style={styles.note}>
            Invite adds them to this event and seeds availability as Awaiting. Remove reverses that.
          </Text>
        </InfoCard>

        <InfoCard title="Musicians">
          {musicians.map((m) => (
            <View key={m.member_id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{m.display_name ?? "Unnamed"}</Text>
                <Text style={styles.sub}>{instrumentsDisplay(m) || "No instruments set"}</Text>
              </View>
              {actionButton(m)}
            </View>
          ))}
          {musicians.length === 0 ? <Text style={styles.empty}>No musicians found.</Text> : null}
        </InfoCard>

        <InfoCard title="Crew">
          {crew.map((m) => (
            <View key={m.member_id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{m.display_name ?? "Unnamed"}</Text>
                <Text style={styles.sub}>{roleDisplay(m) || "No role set"}</Text>
              </View>
              {actionButton(m)}
            </View>
          ))}
          {crew.length === 0 ? <Text style={styles.empty}>No crew found.</Text> : null}
        </InfoCard>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  note: { fontSize: 13, color: "#444", fontWeight: "600" },
  error: { fontSize: 13, color: "#C62828", fontWeight: "800" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  name: { fontSize: 14, fontWeight: "900", color: "#111" },
  sub: { fontSize: 12, color: "#666", marginTop: 2 },

  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,128,128,0.35)",
    backgroundColor: "rgba(0,128,128,0.10)",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 12, fontWeight: "900", color: "#008080" },

  removeButton: {
    borderColor: "rgba(198,40,40,0.40)",
    backgroundColor: "rgba(198,40,40,0.10)",
  },
  removeButtonText: { color: "#C62828" },

  empty: { paddingVertical: 10, color: "#666" },
});