import { supabase } from "@/lib/supabase";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

function getTokensFromUrl(url: string) {
  const hashIndex = url.indexOf("#");
  const queryIndex = url.indexOf("?");

  const fragment = hashIndex >= 0 ? url.slice(hashIndex + 1) : "";
  const query =
    queryIndex >= 0
      ? url.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined)
      : "";

  const params = new URLSearchParams(
    [query, fragment].filter(Boolean).join("&")
  );

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  return { accessToken, refreshToken };
}

export default function AuthCallback() {
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ready, setReady] = useState(false);
  const [statusText, setStatusText] = useState("Opening invite link...");

  useEffect(() => {
    let mounted = true;

    async function handleUrl(url: string | null) {
      try {
        if (!url) {
          if (mounted) setStatusText("Invalid or expired link.");
          return;
        }

        const { accessToken, refreshToken } = getTokensFromUrl(url);

        if (!accessToken || !refreshToken) {
          if (mounted) setStatusText("Invalid or expired link.");
          return;
        }

        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) throw error;

        if (!mounted) return;

        setReady(true);
        setStatusText("Enter a new password for your account.");
      } catch (error: any) {
        if (!mounted) return;

        setStatusText("This link could not be completed.");
        Alert.alert(
          "Invite link failed",
          error?.message ?? "Could not complete account activation."
        );
      }
    }

    Linking.getInitialURL().then(handleUrl);

    const sub = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url);
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  async function setPassword() {
    if (!ready) return;

    if (newPassword.length < 8) {
      Alert.alert("Password too short", "Use at least 8 characters.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      Alert.alert("Failed to set password", error.message);
      return;
    }

    Alert.alert("Password updated", "You can now sign in.");
    router.replace("/auth");
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 20,
          justifyContent: "center",
          paddingBottom: 40,
        }}
        keyboardShouldPersistTaps="always"
      >
        <View style={{ width: "100%", gap: 12 }}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: "#111" }}>
            Set a new password
          </Text>

          <Text style={{ color: "#666", fontSize: 16 }}>{statusText}</Text>

          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: "#444",
              marginTop: 8,
            }}
          >
            New password
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={ready}
              returnKeyType="done"
              onSubmitEditing={setPassword}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: "#ddd",
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 12,
                fontSize: 16,
                opacity: ready ? 1 : 0.5,
              }}
            />

            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              style={{
                marginLeft: 10,
                paddingHorizontal: 12,
                paddingVertical: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#ddd",
                justifyContent: "center",
              }}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            >
              <Text style={{ fontWeight: "800", color: "#009999" }}>
                {showPassword ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={setPassword}
            disabled={!ready}
            style={{
              marginTop: 8,
              backgroundColor: ready ? "#009999" : "#999",
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
              Update password
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}