// app/auth.tsx

import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function AuthScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function signInWithPassword() {
    setErrorMsg(null);
    setStatus(null);

    const emailClean = email.trim().toLowerCase();
    if (!emailClean || !password) {
      setErrorMsg("Enter email and password.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailClean,
        password,
      });
      if (error) throw error;

      setStatus("Signed in.");
      router.replace("/");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function sendPasswordReset() {
    setErrorMsg(null);
    setStatus(null);

    const emailClean = email.trim().toLowerCase();
    if (!emailClean) {
      Alert.alert("Enter your email", "Type your email first, then tap reset.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailClean);
      if (error) throw error;

      setStatus("Reset email sent. Check your inbox.");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="always">
        <View style={styles.card}>
          <Text style={styles.title}>Sign in</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholder="you@example.com"
            returnKeyType="next"
            textContentType="emailAddress"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              style={[styles.input, styles.passwordInput]}
              placeholder="Password"
              returnKeyType="done"
              textContentType="password"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              onSubmitEditing={signInWithPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              style={styles.showBtn}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            >
              <Text style={styles.showBtnText}>{showPassword ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
          </View>

          {status ? <Text style={styles.status}>{status}</Text> : null}
          {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

          <TouchableOpacity style={styles.button} onPress={signInWithPassword} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={sendPasswordReset} disabled={loading} style={styles.linkBtn}>
            <Text style={styles.link}>Forgot password?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  container: { flexGrow: 1, padding: 20, justifyContent: "center", paddingBottom: 40 },
  card: { width: "100%" },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 12, color: "#111" },

  label: { fontSize: 13, fontWeight: "700", color: "#444", marginTop: 10, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },

  passwordRow: { flexDirection: "row", alignItems: "center" },
  passwordInput: { flex: 1 },
  showBtn: {
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    justifyContent: "center",
  },
  showBtnText: { fontWeight: "800", color: "#009999" },

  status: { marginTop: 12, color: "#666", textAlign: "center", fontWeight: "700" },
  error: { marginTop: 12, color: "#b00020", fontWeight: "800", textAlign: "center" },

  button: {
    marginTop: 14,
    backgroundColor: "#009999",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  linkBtn: { marginTop: 12 },
  link: { color: "#009999", fontWeight: "800", textAlign: "center" },
});