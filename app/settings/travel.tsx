import { supabase } from "@/lib/supabase";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type AppSettingsRow = {
  id?: string;
  default_departure_address: string | null;
  default_departure_postcode: string | null;
};

function clean(v?: string | null) {
  const t = (v ?? "").trim();
  return t.length ? t : null;
}

type StatusKind = "ok" | "error";

export default function TravelDefaultsScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<StatusKind>("ok");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setError(message: string) {
    setStatusKind("error");
    setStatusMsg(message);
  }

  function setOk(message: string) {
    setStatusKind("ok");
    setStatusMsg(message);
  }

  async function load() {
    setLoading(true);
    setStatusMsg(null);

    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("default_departure_address, default_departure_postcode")
        .eq("id", "global")
        .maybeSingle();

      if (error) {
        setError(`Load failed: ${error.message}`);
        return;
      }

      const row = (data as AppSettingsRow) ?? null;
      setAddress(row?.default_departure_address ?? "");
      setPostcode(row?.default_departure_postcode ?? "");
    } finally {
      setLoading(false);
    }
  }

  async function onSave() {
    if (saving || loading) return;

    setSaving(true);
    setStatusMsg(null);

    try {
      const payload: AppSettingsRow = {
        default_departure_address: clean(address),
        default_departure_postcode: clean(postcode),
      };

      const { error: upsertErr } = await supabase
        .from("app_settings")
        .upsert({ id: "global", ...payload }, { onConflict: "id" });

      if (upsertErr) {
        setError(`Save failed: ${upsertErr.message}`);
        return;
      }

      setOk("Saved.");
      setTimeout(() => router.back(), 400);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Default departure" }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.title}>Default departure location</Text>
            <Text style={styles.sub}>
              Used for all events unless you override it on a specific event.
            </Text>

            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Loading…</Text>
              </View>
            ) : (
              <>
                <Text style={styles.label}>Departure address</Text>
                <TextInput
                  style={styles.input}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="e.g. Rehearsal Room, 12 High St"
                  placeholderTextColor="#999"
                />

                <Text style={styles.label}>Departure postcode</Text>
                <TextInput
                  style={styles.input}
                  value={postcode}
                  onChangeText={setPostcode}
                  placeholder="e.g. NE1 1AA"
                  placeholderTextColor="#999"
                  autoCapitalize="characters"
                />

                {statusMsg ? (
                  <Text
                    style={[
                      styles.statusMsg,
                      statusKind === "error"
                        ? styles.statusError
                        : styles.statusOk,
                    ]}
                  >
                    {statusMsg}
                  </Text>
                ) : null}
              </>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              (saving || loading) && styles.saveBtnDisabled,
              pressed && !(saving || loading) && styles.saveBtnPressed,
            ]}
            onPress={onSave}
            disabled={saving || loading}
          >
            <Text style={styles.saveText}>
              {saving ? "Saving…" : "Save defaults"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28, backgroundColor: "#f5f5f5" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e6e6e6",
  },
  title: { fontSize: 16, fontWeight: "900", color: "#111" },
  sub: { marginTop: 6, fontSize: 12, color: "#666", lineHeight: 16 },

  loadingRow: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  loadingText: { fontSize: 12, color: "#666", fontWeight: "700" },

  label: { marginTop: 14, fontSize: 12, fontWeight: "900", color: "#444" },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111",
    backgroundColor: "#fff",
  },

  statusMsg: { marginTop: 10, fontSize: 12, fontWeight: "800" },
  statusOk: { color: "#008080" },
  statusError: { color: "#B00020" },

  saveBtn: {
    marginTop: 12,
    backgroundColor: "#4FB3B3",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnPressed: { opacity: 0.85 },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "900" },
});