import { supabase } from "@/lib/supabase";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
    [query, fragment].filter(Boolean).join("&"),
  );

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  return { accessToken, refreshToken };
}

export default function AuthCallback() {
  const router = useRouter();
  const { t } = useTranslation();

  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ready, setReady] = useState(false);
  const [statusText, setStatusText] = useState(t("authCallback.openingInviteLink"));

  useEffect(() => {
    let mounted = true;

    async function handleUrl(url: string | null) {
      try {
        if (!url) {
          if (mounted) setStatusText(t("authCallback.invalidOrExpiredLink"));
          return;
        }

        const { accessToken, refreshToken } = getTokensFromUrl(url);

        if (!accessToken || !refreshToken) {
          if (mounted) setStatusText(t("authCallback.invalidOrExpiredLink"));
          return;
        }

        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) throw error;

        if (!mounted) return;

        setReady(true);
        setStatusText(t("authCallback.enterNewPassword"));
      } catch (error: any) {
        if (!mounted) return;

        setStatusText(t("authCallback.linkCouldNotBeCompleted"));
        Alert.alert(
          t("authCallback.inviteLinkFailed"),
          error?.message ?? t("authCallback.couldNotCompleteActivation"),
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
      Alert.alert(t("authCallback.passwordTooShort"), t("authCallback.useAtLeast8Chars"));
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      Alert.alert(t("authCallback.failedToSetPassword"), error.message);
      return;
    }

    Alert.alert(t("authCallback.passwordUpdated"), t("authCallback.youCanNowSignIn"));
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
            {t("authCallback.newPassword")}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t("authCallback.newPassword")}
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
              accessibilityLabel={
                showPassword
                  ? t("authCallback.hidePassword")
                  : t("authCallback.showPassword")
              }
            >
              <Text style={{ fontWeight: "800", color: "#009999" }}>
                {showPassword ? t("authCallback.hide") : t("authCallback.show")}
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
