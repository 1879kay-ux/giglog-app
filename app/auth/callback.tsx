import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function AuthCallback() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // If we got here from a recovery/magic link, Supabase should now have a session.
    // This just gives a moment for the auth state to settle.
    const t = setTimeout(() => setReady(true), 250);
    return () => clearTimeout(t);
  }, []);

  async function setPassword() {
    if (newPassword.length < 8) {
      Alert.alert("Password too short", "Use at least 8 characters.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      Alert.alert("Failed to set password", error.message);
      return;
    }

    Alert.alert("Password updated", "You can sign in now.");
    router.replace("/auth"); // or wherever your login screen is
  }

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "800" }}>Set a new password</Text>
      <Text style={{ color: "#666" }}>
        {ready ? "Enter a new password for your account." : "Opening reset link..."}
      </Text>

      <TextInput
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="New password"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 12, fontSize: 16 }}
      />

      <TouchableOpacity
        onPress={setPassword}
        style={{ backgroundColor: "#009999", padding: 12, borderRadius: 12, alignItems: "center" }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>Update password</Text>
      </TouchableOpacity>
    </View>
  );
}