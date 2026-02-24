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

  // Debug UI that works on iOS + web (Alert can be unreliable on web)
  const [status, setStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function signIn() {
    setErrorMsg(null);
    setStatus("Sign in tapped");

    if (!email || !password) {
      setErrorMsg("Enter email and password.");
      setStatus(null);
      return;
    }

    setLoading(true);
    setStatus("Calling Supabase...");
    console.log("SIGN IN:", { email });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      console.log("SUPABASE RESULT:", { data, error });

      if (error) throw error;

      setStatus("Signed in, routing...");
      router.replace("/"); // simple MVP behaviour
    } catch (e: any) {
      console.log("SIGN IN ERROR:", e);
      setErrorMsg(e?.message ?? "Unknown error");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    setErrorMsg(null);
    setStatus(null);

    if (!email) {
      Alert.alert("Enter your email", "Type your email first, then tap reset.");
      return;
    }

    setLoading(true);
    setStatus("Sending reset email...");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;

      setStatus("Reset email sent");
      Alert.alert("Password reset sent", "Check your inbox for the reset link.");
    } catch (e: any) {
      console.log("RESET ERROR:", e);
      setErrorMsg(e?.message ?? "Unknown error");
      setStatus(null);
      Alert.alert("Reset failed", e?.message ?? "Unknown error");
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
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>
            Access is by invitation only. Ask the band admin for access.
          </Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={(t) => setEmail(t.trim())}
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
              onSubmitEditing={signIn}
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

          <TouchableOpacity style={styles.button} onPress={signIn} disabled={loading}>
            {loading ? <ActivityIndicator /> : <Text style={styles.buttonText}>Sign in</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={resetPassword} disabled={loading} style={styles.linkBtn}>
            <Text style={styles.link}>Forgot password?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },

  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingBottom: 40,
  },

  card: {
    width: "100%",
  },

  title: { fontSize: 22, fontWeight: "800", marginBottom: 6, color: "#111" },
  subtitle: { fontSize: 13, color: "#666", marginBottom: 18, lineHeight: 18 },

  label: { fontSize: 13, fontWeight: "700", color: "#444", marginTop: 10, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },

  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
  },
  showBtn: {
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    justifyContent: "center",
  },
  showBtnText: {
    fontWeight: "800",
    color: "#009999",
  },

  status: { marginTop: 10, color: "#666", textAlign: "center" },
  error: { marginTop: 10, color: "#b00020", fontWeight: "800", textAlign: "center" },

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