import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      <Stack.Screen
        options={{
          title: t("travel.screenTitle"),
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: "#fff",
          headerTitleStyle: { color: "#fff", fontWeight: "700" },
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.title}>{t("travel.cardTitle")}</Text>
            <Text style={styles.sub}>
              {t("travel.cardSub")}
            </Text>

            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Loading…</Text>
              </View>
            ) : (
              <>
                <Text style={styles.label}>{t("travel.departureAddress")}</Text>
                <TextInput
                  style={styles.input}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="e.g. Rehearsal Room, 12 High St"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={styles.label}>{t("travel.departurePostcode")}</Text>
                <TextInput
                  style={styles.input}
                  value={postcode}
                  onChangeText={setPostcode}
                  placeholder="e.g. NE1 1AA"
                  placeholderTextColor={colors.textMuted}
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
              {saving ? "Saving…" : t("travel.saveDefaults")}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28, backgroundColor: colors.pageBg },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 16, fontWeight: "900", color: colors.text },
  sub: { marginTop: 6, fontSize: 12, color: colors.textMuted, lineHeight: 16 },

  loadingRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: { fontSize: 12, color: colors.textMuted, fontWeight: "700" },

  label: { marginTop: 14, fontSize: 12, fontWeight: "900", color: colors.text },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.cardBg,
  },

  statusMsg: { marginTop: 10, fontSize: 12, fontWeight: "800" },
  statusOk: { color: colors.primary },
  statusError: { color: colors.danger },

  saveBtn: {
    marginTop: 12,
    backgroundColor: colors.button,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnPressed: { opacity: 0.85 },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "900" },
});
