// app/profile/index.tsx

import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ProfileScreen() {
  const router = useRouter();

  const [email, setEmail] = useState<string>("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data?.user?.email ?? "");
    });
  }, []);

  async function changePassword() {
    if (newPassword.length < 8) {
      Alert.alert("Password too short", "Use at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        "Passwords do not match",
        "Please retype the same password twice.",
      );
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);

      Alert.alert("Done", "Password updated. Use it next time you sign in.", [
        {
          text: "OK",
          onPress: () => router.replace("/"),
        },
      ]);
    } catch (e: any) {
      Alert.alert("Failed", e?.message ?? "Unknown error");
    } finally {
      setSavingPassword(false);
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    // auth gate should redirect to /auth
  }

  const mismatch =
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword !== confirmPassword;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Profile",
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: colors.primary },
          headerTitleStyle: { color: "#fff", fontWeight: "700", fontSize: 18 },
          headerTintColor: "#fff",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ paddingLeft: 12 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back-outline" size={26} color="#fff" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push("/")}
              style={{ paddingRight: 12 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="home-outline" size={26} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.container}>
        <TouchableOpacity
          style={styles.availabilityCard}
          onPress={() => router.push("/profile/unavailability")}
        >
          <Ionicons name="calendar-outline" size={24} color={colors.primary} />

          <View style={{ flex: 1 }}>
            <Text style={styles.availabilityTitle}>Unavailable Periods</Text>
            <Text style={styles.availabilitySubtitle}>
              Add holidays, work blocks or dates you can’t gig
            </Text>
          </View>

          <Ionicons name="chevron-forward-outline" size={22} color="#999" />
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.label}>Change password</Text>

          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New password"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            returnKeyType="next"
          />

          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat new password"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, mismatch ? styles.inputError : null]}
            returnKeyType="done"
            onSubmitEditing={changePassword}
          />

          {mismatch ? (
            <Text style={styles.errorText}>Passwords do not match.</Text>
          ) : null}

          <TouchableOpacity
            onPress={() => setShowPassword((v) => !v)}
            style={styles.showBtn}
            accessibilityRole="button"
            accessibilityLabel={
              showPassword ? "Hide password" : "Show password"
            }
          >
            <Text style={styles.showBtnText}>
              {showPassword ? "Hide" : "Show"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              savingPassword ? styles.btnDisabled : null,
            ]}
            onPress={changePassword}
            disabled={savingPassword}
          >
            {savingPassword ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Update password</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.hint}>
            Tip: set this once and you can ignore email reset links.
          </Text>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },

  card: {
    backgroundColor: "#f7f7f7",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    marginBottom: 16,
  },
  label: { fontSize: 12, fontWeight: "800", color: "#666" },
  value: { fontSize: 14, fontWeight: "800", color: "#111", marginTop: 4 },

  input: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  inputError: {
    borderColor: "#b00020",
  },
  errorText: {
    marginTop: 8,
    color: "#b00020",
    fontWeight: "800",
    fontSize: 12,
  },
  availabilityCard: {
    backgroundColor: "#EFFFFC",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  availabilityTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111",
  },

  availabilitySubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: "#555",
    fontWeight: "600",
  },
  showBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  showBtnText: {
    fontWeight: "900",
    color: colors.primary,
  },

  primaryBtn: {
    marginTop: 12,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: { color: "#fff", fontWeight: "900" },

  hint: { marginTop: 10, fontSize: 12, color: "#666" },

  signOutBtn: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#C62828",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  signOutText: { color: "#C62828", fontWeight: "900" },
});
