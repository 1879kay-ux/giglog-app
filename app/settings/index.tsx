import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import { supabase } from "@/lib/supabase";
import { pickAndUploadBandLogo } from "@/lib/uploadBandLogo";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

type AppSettingsRow = {
  id?: string;
  default_departure_address: string | null;
  default_departure_postcode: string | null;
};

function clean(v?: string | null) {
  const t = (v ?? "").trim();
  return t.length ? t : null;
}

export default function SettingsScreen() {
  const { loading, isAdmin, adminModeEnabled, setAdminModeEnabled } = useCurrentMember() as any;
  const canAdminEdit = !!isAdmin && !!adminModeEnabled;

  const [saving, setSaving] = useState(false);
  const [bandId, setBandId] = useState<string | null>(null);
  const [bandName, setBandName] = useState("");
  const [savingBandName, setSavingBandName] = useState(false);

  const [defaults, setDefaults] = useState<AppSettingsRow>({
    default_departure_address: null,
    default_departure_postcode: null,
  });

  const router = useRouter();

  // Load band_id + current band_name
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;

        const user = userData.user;
        if (!user) return;

        const { data: memberRow, error: memberErr } = await supabase
          .from("band_members")
          .select(
            `
            band_id,
            bands:band_id (
              band_name
            )
          `
          )
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (memberErr) throw memberErr;
        if (cancelled) return;

        const bId = (memberRow as any)?.band_id ?? null;
        const bObj = Array.isArray((memberRow as any)?.bands)
          ? (memberRow as any)?.bands?.[0]
          : (memberRow as any)?.bands;

        setBandId(bId);
        setBandName(bObj?.band_name ?? "");
      } catch (e: any) {
        console.log("settings band load error", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Reload travel defaults whenever Settings comes into focus
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
          console.log("Settings app_settings read error:", error);
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
    }, [])
  );

  async function toggleAdminMode(next: boolean) {
    if (!isAdmin) return;

    setSaving(true);
    try {
      await setAdminModeEnabled(next);
    } catch (e: any) {
      Alert.alert("Update failed", e?.message ?? "Could not update setting.");
    } finally {
      setSaving(false);
    }
  }

  const onSaveBandName = async () => {
    try {
      if (!canAdminEdit) return;

      if (!bandId) {
        Alert.alert("No band", "bandId not found.");
        return;
      }

      const nextName = bandName.trim();
      if (!nextName) {
        Alert.alert("Missing name", "Please enter a band name.");
        return;
      }

      setSavingBandName(true);

      const { error } = await supabase.from("bands").update({ band_name: nextName }).eq("band_id", bandId);

      if (error) throw error;

      Alert.alert("Saved", "Band name updated.");
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? String(e));
    } finally {
      setSavingBandName(false);
    }
  };

  const onChangeLogo = async () => {
    try {
      if (!canAdminEdit) return;

      if (!bandId) {
        Alert.alert("No band", "No band_id found.");
        return;
      }

      const result = await pickAndUploadBandLogo(bandId);
      if (result.canceled) return;

      const { error } = await supabase.from("bands").update({ logo_url: result.publicUrl }).eq("band_id", bandId);

      if (error) throw error;

      router.replace("/");
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? String(e));
    }
  };

  const defaultAddr = clean(defaults.default_departure_address);
  const defaultPc = clean(defaults.default_departure_postcode);

  return (
    <>
      <Stack.Screen options={{ title: "Settings" }} />

      <View style={styles.container}>
        {/* BAND */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Band</Text>
          <Text style={styles.hint}>Update your band name and logo.</Text>

          <Text style={[styles.label, { marginTop: 10 }]}>Band name</Text>
          <TextInput
            value={bandName}
            onChangeText={setBandName}
            placeholder="Enter band name"
            style={[styles.input, !canAdminEdit && { backgroundColor: "#f3f3f3" }]}
            autoCapitalize="words"
            editable={canAdminEdit}
          />

          {canAdminEdit ? (
            <>
              <Pressable
                onPress={onSaveBandName}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  pressed && { opacity: 0.85 },
                  savingBandName && { opacity: 0.6 },
                ]}
                disabled={savingBandName}
              >
                <Text style={styles.secondaryBtnText}>{savingBandName ? "Saving..." : "Save band name"}</Text>
              </Pressable>

              <Pressable
                onPress={onChangeLogo}
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.primaryBtnText}>Change band logo</Text>
              </Pressable>
            </>
          ) : (
            <Text style={[styles.hint, { marginTop: 10 }]}>
              Only band admins can edit band details.
            </Text>
          )}
        </View>

        {/* TRAVEL */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Travel</Text>
          <Text style={styles.hint}>Default departure for all events.</Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Default departure</Text>
            <Text style={styles.infoText}>{defaultAddr ?? "Not set"}</Text>
            <Text style={styles.infoText}>{defaultPc ?? ""}</Text>
          </View>

          {canAdminEdit ? (
            <Pressable
              onPress={() => router.push("/settings/travel" as any)}
              style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.linkBtnText}>Edit default departure</Text>
            </Pressable>
          ) : (
            <Text style={[styles.hint, { marginTop: 10 }]}>
              Only band admins can edit travel defaults.
            </Text>
          )}
        </View>

        {/* ADMIN */}
        {isAdmin ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Admin</Text>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Admin Mode</Text>
                <Text style={styles.hint}>Show or hide edit controls. Only affects your account.</Text>
              </View>

              <Switch value={!!adminModeEnabled} onValueChange={toggleAdminMode} disabled={saving || loading} />
            </View>

            {!adminModeEnabled ? (
              <View style={styles.warnBox}>
                <Text style={styles.warnText}>Admin Mode is off. Edit buttons are hidden.</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Admin</Text>
            <Text style={styles.hint}>No admin settings available.</Text>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 16, gap: 12 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e6e6e6",
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111",
    marginBottom: 8,
  },

  row: { flexDirection: "row", alignItems: "center", gap: 12 },

  label: { fontSize: 14, fontWeight: "800", color: "#111" },
  hint: { fontSize: 12, color: "#666", marginTop: 2 },

  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },

  infoBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#f7f7f7",
    borderRadius: 10,
  },
  infoLabel: { fontSize: 12, fontWeight: "900", color: "#333", marginBottom: 4 },
  infoText: { fontSize: 13, color: "#555" },

  secondaryBtn: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#0b7a75",
    alignSelf: "flex-start",
  },
  secondaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },

  primaryBtn: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#0b7a75",
    alignSelf: "flex-start",
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },

  linkBtn: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#0b7a75",
    alignSelf: "flex-start",
  },
  linkBtnText: { fontWeight: "800", color: "#fff", fontSize: 13 },

  warnBox: {
    marginTop: 10,
    backgroundColor: "#fff4e5",
    borderWidth: 1,
    borderColor: "#f0c36d",
    padding: 10,
    borderRadius: 10,
  },
  warnText: { color: "#7a4b00", fontWeight: "700", fontSize: 12 },
});