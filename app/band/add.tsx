import { supabase } from "@/lib/supabase";
import { Stack, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const MEMBER_TYPES = ["musician", "crew"] as const;
type MemberType = (typeof MEMBER_TYPES)[number];

const MUSICIAN_ROLES = ["Band", "Dep Musician", "Other"] as const;
type MusicianRole = (typeof MUSICIAN_ROLES)[number];

const CREW_ROLES = [
  "Crew",
  "Tour Manager",
  "Merch",
  "FoH Engineer",
  "Monitor Engineer",
  "Lighting",
  "Tech",
  "Other",
] as const;
type CrewRole = (typeof CREW_ROLES)[number];

const INSTRUMENTS = [
  "Lead Vox",
  "Backing Vox",
  "Drums",
  "Bass",
  "Lead Guitar",
  "Guitar",
  "Rhythm Guitar",
  "Keyboards",
  "Saxophone",
  "Trumpet",
  "Trombone",
] as const;
type Instrument = (typeof INSTRUMENTS)[number];

const CREW_ROLE_SET = new Set<string>([
  "Crew",
  "Tour Manager",
  "Merch",
  "FoH Engineer",
  "Monitor Engineer",
  "Lighting",
  "Tech",
]);

type InviteResponse =
  | {
      ok: true;
      member_id: string;
      auth_user_id: string;
      invite_sent: boolean;
      note?: string;
    }
  | {
      ok?: false;
      error?: string;
      details?: string;
    };

export default function AddBandMemberScreen() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");

  const [memberType, setMemberType] = useState<MemberType>("musician");

  // role handling
  const [musicianRole, setMusicianRole] = useState<MusicianRole>("Band");
  const [crewRole, setCrewRole] = useState<CrewRole>("Crew");
  const [roleOther, setRoleOther] = useState("");

  // instruments (musician only)
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [customInstruments, setCustomInstruments] = useState<string[]>([]);
  const [customInstrumentInput, setCustomInstrumentInput] = useState("");

  const [isActive, setIsActive] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const role = useMemo(() => {
    return memberType === "musician" ? musicianRole : crewRole;
  }, [memberType, musicianRole, crewRole]);

  const toggleInstrument = (p: Instrument) => {
    setInstruments((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const addCustomInstrument = () => {
    const v = customInstrumentInput.trim();
    if (!v) return;
    setCustomInstruments((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setCustomInstrumentInput("");
  };

  const removeCustomInstrument = (p: string) => {
    setCustomInstruments((prev) => prev.filter((x) => x !== p));
  };

  async function getCurrentBandId(): Promise<string | null> {
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) {
      console.log("getSession error", sessionErr);
      return null;
    }

    const authUserId = sessionData?.session?.user?.id;
    if (!authUserId) return null;

    const { data: bm, error: bmErr } = await supabase
      .from("band_members")
      .select("band_id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (bmErr) {
      console.log("band_members band_id lookup error", bmErr);
      return null;
    }

    return (bm?.band_id as string) ?? null;
  }

  const onSave = async () => {
    const name = displayName.trim();
    if (!name) {
      Alert.alert("Missing name", "Please enter a display name.");
      return;
    }

    const emailClean = email.trim();
    if (!emailClean) {
      Alert.alert("Missing email", "Please enter an email address.");
      return;
    }

    if (role === "Other" && !roleOther.trim()) {
      Alert.alert("Missing role", "Please enter a value for Role (Other).");
      return;
    }

    const finalMemberType: MemberType = CREW_ROLE_SET.has(role) ? "crew" : memberType;
    const finalPositions = finalMemberType === "musician" ? instruments : [];
    const finalPositionsOther = finalMemberType === "musician" ? customInstruments : [];

    setSaving(true);

    try {
      const bandId = await getCurrentBandId();
      if (!bandId) {
        Alert.alert("Error", "No band_id found for current user. Cannot create member.");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error("No session token - please sign in again.");

      const apikey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      if (!apikey) throw new Error("Missing EXPO_PUBLIC_SUPABASE_ANON_KEY in app runtime");

      const url =
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/invite-band-member` +
        `?apikey=${encodeURIComponent(apikey)}`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          band_id: bandId,
          display_name: name,
          email: emailClean,
          member_type: finalMemberType,
          is_active: isActive,
          is_admin: isAdmin,
          band_role: role,
          band_role_other: role === "Other" ? roleOther.trim() : null,
          is_dep: finalMemberType === "musician" && role === "Dep Musician",
          band_positions: finalPositions,
          band_positions_other: finalPositionsOther,
        }),
      });

      const text = await res.text();
      console.log("invite-band-member fetch status", res.status);
      console.log("invite-band-member fetch body", text);

      let data: InviteResponse;
      try {
        data = JSON.parse(text) as InviteResponse;
      } catch {
        throw new Error(text || "Edge Function returned non-JSON response");
      }

      if (!res.ok || !("ok" in data) || data.ok !== true) {
        const msg = (data as any)?.details ?? (data as any)?.error ?? text ?? "Invite failed";
        throw new Error(msg);
      }

      // Patch remaining UI-only fields if you still want (safe no-op updates)
      const patch: any = {
        band_role: role,
        band_role_other: role === "Other" ? roleOther.trim() || null : null,
        band_positions: finalPositions,
        band_positions_other: finalPositionsOther,
        is_active: isActive,
        is_admin: isAdmin,
        is_dep: finalMemberType === "musician" && role === "Dep Musician",
      };

      const { error: patchErr } = await supabase
        .from("band_members")
        .update(patch)
        .eq("member_id", data.member_id);

      if (patchErr) throw new Error(patchErr.message);

      Alert.alert("Invite sent", data.note ?? (data.invite_sent ? "Invite email sent." : "Member created."));
      router.back();
    } catch (e: any) {
      console.log("invite member error", e);
      Alert.alert("Error", String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const rolesToRender = memberType === "musician" ? MUSICIAN_ROLES : CREW_ROLES;
  const selectedRole = role;

  return (
    <>
      <Stack.Screen options={{ title: "Add Member" }} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="e.g. Ian"
          style={styles.input}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="e.g. ian@yourdomain.com"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <Text style={styles.label}>Member Type</Text>
        <View style={styles.chipWrap}>
          {MEMBER_TYPES.map((t) => {
            const selected = memberType === t;
            return (
              <Pressable
                key={t}
                onPress={() => {
                  setMemberType(t);
                  setRoleOther("");

                  if (t === "musician") {
                    setMusicianRole("Band");
                    setCrewRole("Crew");
                  } else {
                    setCrewRole("Crew");
                    setMusicianRole("Band");
                    setInstruments([]);
                    setCustomInstruments([]);
                    setCustomInstrumentInput("");
                  }
                }}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {t === "musician" ? "Musician" : "Crew"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Role</Text>
        <View style={styles.chipWrap}>
          {rolesToRender.map((r) => {
            const selected = selectedRole === r;
            return (
              <Pressable
                key={r}
                onPress={() => {
                  if (memberType === "musician") setMusicianRole(r as MusicianRole);
                  else setCrewRole(r as CrewRole);

                  if (r !== "Other") setRoleOther("");
                }}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{r}</Text>
              </Pressable>
            );
          })}
        </View>

        {selectedRole === "Other" ? (
          <>
            <Text style={styles.label}>Role (Other)</Text>
            <TextInput
              value={roleOther}
              onChangeText={setRoleOther}
              placeholder="e.g. Playback Tech"
              style={styles.input}
            />
          </>
        ) : null}

        {memberType === "musician" ? (
          <>
            <Text style={styles.label}>Instruments (multi-select)</Text>
            <View style={styles.chipWrap}>
              {INSTRUMENTS.map((p) => {
                const selected = instruments.includes(p);
                return (
                  <Pressable
                    key={p}
                    onPress={() => toggleInstrument(p)}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{p}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Custom instruments</Text>
            <View style={styles.customRow}>
              <TextInput
                value={customInstrumentInput}
                onChangeText={setCustomInstrumentInput}
                placeholder="e.g. Percussion"
                style={[styles.input, { flex: 1, marginTop: 0, marginBottom: 0 }]}
              />
              <Pressable style={styles.addButton} onPress={addCustomInstrument}>
                <Text style={styles.addButtonText}>Add</Text>
              </Pressable>
            </View>

            {customInstruments.length > 0 ? (
              <View style={styles.customChipWrap}>
                {customInstruments.map((p) => (
                  <Pressable
                    key={p}
                    style={[styles.chip, { borderColor: "#009999" }]}
                    onPress={() => removeCustomInstrument(p)}
                  >
                    <Text style={[styles.chipText, { color: "#009999" }]}>{p} ✕</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        ) : null}

        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setIsActive((v) => !v)}
            style={[styles.toggle, isActive && styles.toggleOn]}
          >
            <Text style={[styles.toggleText, isActive && styles.toggleTextOn]}>
              Active: {isActive ? "Yes" : "No"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setIsAdmin((v) => !v)}
            style={[styles.toggle, isAdmin && styles.toggleOn]}
          >
            <Text style={[styles.toggleText, isAdmin && styles.toggleTextOn]}>
              Admin: {isAdmin ? "Yes" : "No"}
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={onSave}
          disabled={saving}
          style={[styles.saveButton, saving && { opacity: 0.7 }]}
        >
          {saving ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator />
              <Text style={styles.saveButtonText}>Saving…</Text>
            </View>
          ) : (
            <Text style={styles.saveButtonText}>Save Member</Text>
          )}
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 32 },

  label: { fontSize: 13, fontWeight: "700", color: "#333", marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 14,
  },

  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  chipSelected: { backgroundColor: "#009999", borderColor: "#009999" },
  chipText: { fontSize: 12, fontWeight: "700", color: "#333" },
  chipTextSelected: { color: "#fff" },

  customRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  addButton: {
    backgroundColor: "#009999",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    justifyContent: "center",
  },
  addButtonText: { color: "#fff", fontWeight: "800" },
  customChipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },

  toggleRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  toggle: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  toggleOn: { borderColor: "#009999" },
  toggleText: { fontSize: 13, fontWeight: "800", color: "#333" },
  toggleTextOn: { color: "#009999" },

  saveButton: {
    marginTop: 18,
    backgroundColor: "#009999",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});