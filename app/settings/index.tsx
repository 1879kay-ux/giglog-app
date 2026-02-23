import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import { Stack } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";

export default function SettingsScreen() {
  const {
    loading,
    isAdmin,
    adminModeEnabled,
    setAdminModeEnabled,
  } = useCurrentMember() as any;

  const [saving, setSaving] = useState(false);

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

  return (
    <>
      <Stack.Screen options={{ title: "Settings" }} />

      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Band</Text>
          <Text style={styles.hint}>Band name and logo later.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Travel</Text>
          <Text style={styles.hint}>Default departure is already handled in Travel settings.</Text>
        </View>

        {isAdmin ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Admin</Text>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Admin Mode</Text>
                <Text style={styles.hint}>
                  Show or hide edit controls. Only affects your account.
                </Text>
              </View>

              <Switch
                value={!!adminModeEnabled}
                onValueChange={toggleAdminMode}
                disabled={saving || loading}
              />
            </View>

            {!adminModeEnabled ? (
              <View style={styles.warnBox}>
                <Text style={styles.warnText}>
                  Admin Mode is off. Edit buttons are hidden.
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Admin</Text>
            <Text style={styles.hint}>No admin settings available.</Text>
          </View>
        )}

        <Pressable
          style={styles.debug}
          onPress={() => {
            Alert.alert(
              "Debug",
              `isAdmin: ${String(isAdmin)}\nadminModeEnabled: ${String(adminModeEnabled)}`
            );
          }}
        >
          <Text style={styles.debugText}>Debug</Text>
        </Pressable>
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

  cardTitle: { fontSize: 15, fontWeight: "900", color: "#111", marginBottom: 8 },

  row: { flexDirection: "row", alignItems: "center", gap: 12 },

  label: { fontSize: 14, fontWeight: "800", color: "#111" },
  hint: { fontSize: 12, color: "#666", marginTop: 2 },

  warnBox: {
    marginTop: 10,
    backgroundColor: "#fff4e5",
    borderWidth: 1,
    borderColor: "#f0c36d",
    padding: 10,
    borderRadius: 10,
  },
  warnText: { color: "#7a4b00", fontWeight: "700", fontSize: 12 },

  debug: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#eee",
  },
  debugText: { fontWeight: "800", color: "#333" },
});