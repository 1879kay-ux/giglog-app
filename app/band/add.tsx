import { supabase } from "@/lib/supabase";
import { Stack, useRouter } from "expo-router";
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

const BAND_ROLES = [
  "Band",
  "Dep Musician",
  "Crew",
  "Tour Manager",
  "Merch",
  "FoH Engineer",
  "Monitor Engineer",
  "Lighting",
  "Tech",
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

type BandRole = (typeof BAND_ROLES)[number];
type BandPosition = (typeof BAND_POSITIONS)[number];

export default function AddBandMemberScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [bandId, setBandId] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<BandRole>("Band");
  const [positions, setPositions] = useState<BandPosition[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const isDep = useMemo(() => role === "Dep Musician", [role]);

  useEffect(() => {
    const loadDefaultBand = async () => {
      const { data, error } = await supabase
        .from("bands")
        .select("band_id")
        .order("created_at", { ascending: true })
        .limit(1);

      if (error) {
        console.log("loadDefaultBand error", error);
        Alert.alert("Error", "Could not load band. Check Supabase connection.");
        setLoading(false);
        return;
      }

      setBandId(data?.[0]?.band_id ?? null);
      setLoading(false);
    };

    loadDefaultBand();
  }, []);

  const togglePosition = (p: BandPosition) => {
    setPositions((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const onSave = async () => {
    if (!bandId) {
      Alert.alert("No band", "Band ID not found yet.");
      return;
    }

    const name = displayName.trim();
    if (!name) {
      Alert.alert("Missing name", "Please enter a display name.");
      return;
    }

    // Email optional (deps/crew may not have one yet)
    const emailClean = email.trim() || null;

    setSaving(true);

    const { error } = await supabase.from("band_members").insert({
      display_name: name,
      email: emailClean,
      band_role: role,
      band_positions: positions, // text[]
      is_active: isActive,
      is_admin: isAdmin,
      is_dep: isDep,
      band_id: bandId,
    });

    setSaving(false);

    if (error) {
      console.log("insert band_member error", error);
      Alert.alert("Error", error.message);
      return;
    }

    router.back();
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "Add Member" }} />
        <View style={styles.loading}>
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

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

        <Text style={styles.label}>Email (optional)</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="e.g. ian@yourdomain.com"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <Text style={styles.label}>Role</Text>
        <View style={styles.chipWrap}>
          {BAND_ROLES.map((r) => {
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

        <Text style={styles.label}>Positions (multi-select)</Text>
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
          <Text style={styles.saveButtonText}>{saving ? "Saving…" : "Save Member"}</Text>
        </Pressable>

        {!bandId ? (
          <Text style={styles.warn}>Warning: band_id not found. Create a band first.</Text>
        ) : null}
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

  warn: { marginTop: 12, color: "#b00020", fontWeight: "700" },
});