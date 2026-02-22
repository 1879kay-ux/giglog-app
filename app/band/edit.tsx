import { supabase } from "@/lib/supabase";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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

type MemberType = "musician" | "crew";

const MUSICIANS_ROLES = ["Band", "Dep Musician", "Other"] as const;
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

const BAND_POSITIONS = [
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

type MusicianRole = (typeof MUSICIANS_ROLES)[number];
type CrewRole = (typeof CREW_ROLES)[number];
type AnyRole = MusicianRole | CrewRole;

type BandPosition = (typeof BAND_POSITIONS)[number];

type BandMemberRow = {
  member_id: string;
  display_name: string | null;
  email: string | null;

  member_type: string | null;

  band_role: string | null;
  band_role_other: string | null;

  band_positions: string[] | null;
  band_positions_other: string[] | null;

  is_active: boolean | null;
  is_admin: boolean | null;
  is_dep: boolean | null;
};

function titleCaseMemberType(v: MemberType) {
  return v === "musician" ? "Musician" : "Crew";
}

export default function EditBandMemberScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");

  const [memberType, setMemberType] = useState<MemberType>("musician");

  const roleOptions = useMemo<readonly AnyRole[]>(
    () => (memberType === "musician" ? MUSICIANS_ROLES : CREW_ROLES),
    [memberType]
  );

  const [role, setRole] = useState<AnyRole>("Band");
  const [roleOther, setRoleOther] = useState("");

  const [positions, setPositions] = useState<BandPosition[]>([]);
  const [customPositions, setCustomPositions] = useState<string[]>([]);
  const [customPositionInput, setCustomPositionInput] = useState("");

  const [isActive, setIsActive] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const isDep = useMemo(() => role === "Dep Musician", [role]);

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

      const mt = (row.member_type ?? "musician") as MemberType;
      setMemberType(mt === "crew" ? "crew" : "musician");

      // Role handling: if not in allowed list for that member_type, set Other
      const incomingRole = (row.band_role ?? (mt === "crew" ? "Crew" : "Band")) as AnyRole;
      setRoleOther(row.band_role_other ?? "");

      // We must set role AFTER memberType is set. Do it safely:
      const isMusician = mt !== "crew";
      const allowed = (isMusician ? MUSICIANS_ROLES : CREW_ROLES) as readonly string[];
      const roleIsAllowed = allowed.includes(incomingRole);

      setRole((roleIsAllowed ? incomingRole : "Other") as AnyRole);

      setPositions((row.band_positions as BandPosition[]) ?? []);
      setCustomPositions((row.band_positions_other as string[]) ?? []);

      setIsActive(!!row.is_active);
      setIsAdmin(!!row.is_admin);

      setLoading(false);
    };

    loadMember();
  }, [id]);

  // When memberType changes, ensure role stays valid for that type
  useEffect(() => {
    const allowed = roleOptions as readonly string[];
    if (!allowed.includes(role)) {
      setRole(memberType === "musician" ? "Band" : "Crew");
      setRoleOther("");
    }

    // If switching to crew, hide instruments (we keep values in DB but don’t show)
    // If you prefer to wipe them when switching to crew, uncomment:
    // if (memberType === "crew") { setPositions([]); setCustomPositions([]); }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberType]);

  const togglePosition = (p: BandPosition) => {
    setPositions((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const addCustomPosition = () => {
    const v = customPositionInput.trim();
    if (!v) return;
    setCustomPositions((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setCustomPositionInput("");
  };

  const removeCustomPosition = (p: string) => {
    setCustomPositions((prev) => prev.filter((x) => x !== p));
  };

  const onSave = async () => {
    if (!id) return;

    const name = displayName.trim();
    if (!name) {
      Alert.alert("Missing name", "Please enter a display name.");
      return;
    }

    if (role === "Other" && !roleOther.trim()) {
      Alert.alert("Missing role", "Please enter a value for Role (Other).");
      return;
    }

    const emailClean = email.trim() || null;

    setSaving(true);

    const { error } = await supabase
      .from("band_members")
      .update({
        display_name: name,
        email: emailClean,

        member_type: memberType,

        band_role: role,
        band_role_other: role === "Other" ? roleOther.trim() || null : null,

        // Only relevant for musicians. We keep data even if crew, but you can wipe if you want.
        band_positions: positions,
        band_positions_other: customPositions,

        is_active: isActive,
        is_admin: isAdmin,
        is_dep: isDep,
      })
      .eq("member_id", id);

    setSaving(false);

    if (error) {
      console.log("update member error", error);
      Alert.alert("Error", error.message);
      return;
    }

    router.back();
  };

  const onDeactivate = async () => {
    if (!id) return;

    Alert.alert("Deactivate member?", "This will hide them from the active list.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Deactivate",
        style: "destructive",
        onPress: async () => {
          setSaving(true);
          const { error } = await supabase
            .from("band_members")
            .update({ is_active: false })
            .eq("member_id", id);
          setSaving(false);

          if (error) {
            Alert.alert("Error", error.message);
            return;
          }
          router.back();
        },
      },
    ]);
  };

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
      <Stack.Screen options={{ title: "Edit Member" }} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Name</Text>
        <TextInput value={displayName} onChangeText={setDisplayName} style={styles.input} />

        <Text style={styles.label}>Email (optional)</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <Text style={styles.label}>Member Type</Text>
        <View style={styles.chipWrap}>
          {(["musician", "crew"] as const).map((t) => {
            const selected = memberType === t;
            return (
              <Pressable
                key={t}
                onPress={() => setMemberType(t)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {titleCaseMemberType(t)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Role</Text>
        <View style={styles.chipWrap}>
          {roleOptions.map((r) => {
            const selected = role === r;
            return (
              <Pressable
                key={r}
                onPress={() => setRole(r)}
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
              {BAND_POSITIONS.map((p) => {
                const selected = positions.includes(p);
                return (
                  <Pressable
                    key={p}
                    onPress={() => togglePosition(p)}
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
                value={customPositionInput}
                onChangeText={setCustomPositionInput}
                placeholder="e.g. Percussion"
                style={[styles.input, { flex: 1, marginTop: 0, marginBottom: 0 }]}
              />
              <Pressable style={styles.addButton} onPress={addCustomPosition}>
                <Text style={styles.addButtonText}>Add</Text>
              </Pressable>
            </View>

            {customPositions.length > 0 ? (
              <View style={styles.customChipWrap}>
                {customPositions.map((p) => (
                  <Pressable
                    key={p}
                    style={[styles.chip, { borderColor: "#009999" }]}
                    onPress={() => removeCustomPosition(p)}
                  >
                    <Text style={[styles.chipText, { color: "#009999" }]}>{p} ✕</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <Text style={styles.helperText}>
            Instruments are only shown for Musicians.
          </Text>
        )}

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
          <Text style={styles.saveButtonText}>{saving ? "Saving…" : "Save Changes"}</Text>
        </Pressable>

        <Pressable
          onPress={onDeactivate}
          disabled={saving}
          style={[styles.dangerButton, saving && { opacity: 0.7 }]}
        >
          <Text style={styles.dangerButtonText}>Deactivate Member</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },

  container: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16, paddingBottom: 32 },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginTop: 12,
    marginBottom: 6,
  },
  helperText: { marginTop: 10, color: "#666", fontSize: 12, fontStyle: "italic" },

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
});