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
  TextInput, TouchableOpacity, View
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

type BandMemberRow = {
  member_id: string;
  display_name: string | null;
  email: string | null;

  member_type: MemberType | null;

  band_role: string | null;
  band_role_other: string | null;

  band_positions: string[] | null;
  band_positions_other: string[] | null;

  is_active: boolean | null;
  is_admin: boolean | null;
  is_dep: boolean | null;
};

export default function EditBandMemberScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");

  const [memberType, setMemberType] = useState<MemberType>("musician");

  const [musicianRole, setMusicianRole] = useState<MusicianRole>("Band");
  const [crewRole, setCrewRole] = useState<CrewRole>("Crew");
  const [roleOther, setRoleOther] = useState("");

  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [customInstruments, setCustomInstruments] = useState<string[]>([]);
  const [customInstrumentInput, setCustomInstrumentInput] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const role = useMemo(() => {
    return memberType === "musician" ? musicianRole : crewRole;
  }, [memberType, musicianRole, crewRole]);

  const isDep = useMemo(
    () => memberType === "musician" && musicianRole === "Dep Musician",
    [memberType, musicianRole]
  );

  useEffect(() => {
    const loadMember = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("band_members")
        .select(
          "member_id, display_name, email, member_type, band_role, band_role_other, band_positions, band_positions_other, is_active, is_admin, is_dep"
        )
        .eq("member_id", id)
        .single();

      if (error) {
        console.log("loadMember error", error);
        Alert.alert("Error", error.message);
        setLoading(false);
        return;
      }

      const row = data as BandMemberRow;

      setDisplayName(row.display_name ?? "");
      setEmail(row.email ?? "");

      const mt: MemberType = (row.member_type as MemberType) ?? "musician";
      setMemberType(mt);

      if (mt === "musician") {
        const rv = (row.band_role ?? "Band") as MusicianRole;
        const isPreset = (MUSICIAN_ROLES as readonly string[]).includes(rv);
        setMusicianRole((isPreset ? rv : "Other") as MusicianRole);
        setCrewRole("Crew");
      } else {
        const rv = (row.band_role ?? "Crew") as CrewRole;
        const isPreset = (CREW_ROLES as readonly string[]).includes(rv);
        setCrewRole((isPreset ? rv : "Other") as CrewRole);
        setMusicianRole("Band");
      }

      setRoleOther(row.band_role_other ?? "");

      setInstruments((row.band_positions as Instrument[]) ?? []);
      setCustomInstruments((row.band_positions_other as string[]) ?? []);

      setIsAdmin(!!row.is_admin);
      setIsActive(!!row.is_active);

      setLoading(false);
    };

    loadMember();
  }, [id]);

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

  const onSave = async () => {
    if (!id) return;

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

    setSaving(true);

    const payload: any = {
      display_name: name,
      email: emailClean,

      member_type: memberType,

      band_role: role,
      band_role_other: role === "Other" ? roleOther.trim() || null : null,

      band_positions: memberType === "musician" ? instruments : [],
      band_positions_other: memberType === "musician" ? customInstruments : [],

      is_admin: isAdmin,
      is_dep: isDep,
      // note: is_active is controlled by the Activate/Deactivate button now
    };

    const { error } = await supabase.from("band_members").update(payload).eq("member_id", id);

    setSaving(false);

    if (error) {
      console.log("update member error", error);
      Alert.alert("Error", error.message);
      return;
    }

    router.back();
  };

  const confirm = async (title: string, message: string) => {
    if (Platform.OS === "web") {
      return window.confirm(`${title}\n\n${message}`);
    }
    return await new Promise<boolean>((resolve) => {
      Alert.alert(title, message, [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: "OK", style: "default", onPress: () => resolve(true) },
      ]);
    });
  };

  const setActive = async (nextActive: boolean) => {
    if (!id) return;

    const ok = await confirm(
      nextActive ? "Reactivate member?" : "Deactivate member?",
      nextActive
        ? "This will show them in the active list again."
        : "This will hide them from the active list."
    );
    if (!ok) return;

    setSaving(true);
    const { error } = await supabase
      .from("band_members")
      .update({ is_active: nextActive })
      .eq("member_id", id);
    setSaving(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    setIsActive(nextActive);
    router.back();
  };

  const rolesToRender = memberType === "musician" ? MUSICIAN_ROLES : CREW_ROLES;

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "Edit Member" }} />
        <View style={styles.loading}>
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
  options={{
    title: "Add Member",
    headerTitleAlign: "center",
    headerStyle: { backgroundColor: "#008080" },
    headerTitleStyle: { color: "#fff", fontWeight: "700" },
    headerTintColor: "#fff",
    headerLeft: () => (
      <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 12 }}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </TouchableOpacity>
    ),
  }}
/>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Name</Text>
        <TextInput value={displayName} onChangeText={setDisplayName} style={styles.input} />

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
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
            const selected = role === r;
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

        {role === "Other" ? (
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
            onPress={() => setIsAdmin((v) => !v)}
            style={[styles.toggle, isAdmin && styles.toggleOn]}
          >
            <Text style={[styles.toggleText, isAdmin && styles.toggleTextOn]}>
              Admin: {isAdmin ? "Yes" : "No"}
            </Text>
          </Pressable>

          <View style={[styles.toggle, { opacity: 0.9 }]}>
            <Text style={styles.toggleText}>Status: {isActive ? "Active" : "Inactive"}</Text>
          </View>
        </View>

        <Pressable
          onPress={onSave}
          disabled={saving}
          style={[styles.saveButton, saving && { opacity: 0.7 }]}
        >
          <Text style={styles.saveButtonText}>{saving ? "Saving…" : "Save Changes"}</Text>
        </Pressable>

        {isActive ? (
          <Pressable
            onPress={() => setActive(false)}
            disabled={saving}
            style={[styles.dangerButton, saving && { opacity: 0.7 }]}
          >
            <Text style={styles.dangerButtonText}>Deactivate Member</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => setActive(true)}
            disabled={saving}
            style={[styles.activateButton, saving && { opacity: 0.7 }]}
          >
            <Text style={styles.activateButtonText}>Reactivate Member</Text>
          </Pressable>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },

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

  dangerButton: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E74C3C",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  dangerButtonText: { color: "#E74C3C", fontSize: 15, fontWeight: "800" },

  activateButton: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#009999",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  activateButtonText: { color: "#009999", fontSize: 15, fontWeight: "800" },
});