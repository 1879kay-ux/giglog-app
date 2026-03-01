// app/band-documents/edit.tsx

import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

type DocType = "tech" | "rider" | "setlist" | "contracts" | "other";

type BandDocRow = {
  doc_id: string;
  band_id: string;
  title: string | null;
  doc_type: DocType | null;
  storage_bucket: string;
  storage_path: string;
  created_at?: string;
};

const BUCKET = "band-docs";

function niceTitleFromFilename(name: string) {
  const base = name.replace(/\.[^/.]+$/, ""); // strip extension
  return base.replace(/[_-]+/g, " ").trim();
}

function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export default function BandDocumentsEditScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [bandId, setBandId] = useState<string | null>(null);
  const [docs, setDocs] = useState<BandDocRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;

      const userId = userData.user?.id;
      if (!userId) throw new Error("Not logged in");

      // band_members -> band_id
      const { data: bm, error: bmErr } = await supabase
        .from("band_members")
        .select("band_id")
        .eq("auth_user_id", userId)
        .maybeSingle();

      if (bmErr) throw bmErr;

      const bId = (bm as any)?.band_id as string | null;
      if (!bId) throw new Error("No band membership found");

      setBandId(bId);

      const { data, error } = await supabase
        .from("band_documents")
        .select("doc_id, band_id, title, doc_type, storage_bucket, storage_path, created_at")
        .eq("band_id", bId)
        .order("doc_type", { ascending: true })
        .order("title", { ascending: true });

      if (error) throw error;

      setDocs((data ?? []) as BandDocRow[]);
    } catch (e: any) {
      console.log("band docs edit load error", e);
      Alert.alert("Error", e?.message ?? "Failed to load documents");
      setDocs([]);
      setBandId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const docTypeOptions: { key: DocType; label: string }[] = useMemo(
    () => [
      { key: "tech", label: "Tech" },
      { key: "rider", label: "Rider" },
      { key: "setlist", label: "Set list" },
      { key: "contracts", label: "Contracts" },
      { key: "other", label: "Other" },
    ],
    []
  );

  function updateLocal(docId: string, patch: Partial<BandDocRow>) {
    setDocs((prev) => prev.map((d) => (d.doc_id === docId ? { ...d, ...patch } : d)));
  }

  async function saveRow(doc: BandDocRow) {
    setSavingId(doc.doc_id);
    try {
      const { error } = await supabase
        .from("band_documents")
        .update({
          title: (doc.title ?? "").trim() || null,
          doc_type: doc.doc_type ?? "other",
        })
        .eq("doc_id", doc.doc_id);

      if (error) throw error;
    } catch (e: any) {
      console.log("save doc error", e);
      Alert.alert("Error", e?.message ?? "Failed to save");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteRow(doc: BandDocRow) {
  setDeletingId(doc.doc_id);
  try {
    // delete storage object first (ignore if it fails)
    const { error: storErr } = await supabase.storage
      .from(doc.storage_bucket)
      .remove([doc.storage_path]);

    if (storErr) console.log("storage delete error (ignored):", storErr);

    const { error: dbErr } = await supabase
      .from("band_documents")
      .delete()
      .eq("doc_id", doc.doc_id);

    if (dbErr) throw dbErr;

    setDocs((prev) => prev.filter((d) => d.doc_id !== doc.doc_id));
  } catch (e: any) {
    console.log("delete doc error", e);
    Alert.alert("Delete failed", e?.message ?? "Failed to delete");
  } finally {
    setDeletingId(null);
  }
}

  async function uploadNew() {
  if (!bandId) {
    Alert.alert("Upload failed", "No band found for this user.");
    return;
  }

  setUploading(true);
  try {
    const res = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (res.canceled) {
      Alert.alert("Upload", "Cancelled.");
      return;
    }

    const file = res.assets?.[0];
    if (!file) {
      Alert.alert("Upload failed", "No file returned from picker.");
      return;
    }

    const filename = file.name || "document";
    const path = `bands/${bandId}/${filename}`;

    // 1) Read file data
    const blob = await fetch(file.uri).then((r) => r.blob());

    // 2) Upload to storage
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, {
      upsert: false,
      contentType: (file.mimeType as string | undefined) ?? undefined,
    });

    if (upErr) {
      console.log("UPLOAD ERROR:", upErr);
      Alert.alert("Upload failed", upErr.message);
      return;
    }

    // 3) Insert DB row
    const docId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? // @ts-ignore
          crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    const title = niceTitleFromFilename(filename);

    const { error: insErr } = await supabase.from("band_documents").insert({
      doc_id: docId,
      band_id: bandId,
      title,
      doc_type: "other",
      storage_bucket: BUCKET,
      storage_path: path,
    });

    if (insErr) {
      console.log("INSERT ERROR:", insErr);
      Alert.alert("Upload saved file, but DB insert failed", insErr.message);
      return;
    }

    Alert.alert("Uploaded", filename);

    // 4) Reload list so you see it immediately
    await load();
  } catch (e: any) {
    console.log("upload doc error", e);
    Alert.alert("Upload failed", e?.message ?? "Could not upload document");
  } finally {
    setUploading(false);
  }
}

  return (
    <>
      <Stack.Screen
        options={{
          title: "Edit Band Docs",
          headerStyle: { backgroundColor: "#0D9488" },
          headerTintColor: "#fff",
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>
          <Text style={styles.h1}>Documents</Text>

          <Pressable
            onPress={uploadNew}
            disabled={uploading || loading}
            style={({ pressed }) => [
              styles.primaryBtn,
              (uploading || loading) && styles.btnDisabled,
              pressed && styles.pressed,
            ]}
          >
            {uploading ? (
              <ActivityIndicator />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={16} color="#0F766E" />
                <Text style={styles.primaryBtnText}>Upload</Text>
              </>
            )}
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator />
          </View>
        ) : docs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No documents yet</Text>
            <Text style={styles.emptyText}>Upload your first doc using the Upload button.</Text>
          </View>
        ) : (
          docs.map((d) => (
            <View key={d.doc_id} style={styles.card}>
              <TextInput
                value={d.title ?? ""}
                onChangeText={(t) => updateLocal(d.doc_id, { title: t })}
                placeholder="Document title"
                style={styles.input}
                placeholderTextColor="#999"
              />

              <View style={styles.typeRow}>
                {docTypeOptions.map((opt) => {
                  const selected = (d.doc_type ?? "other") === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => updateLocal(d.doc_id, { doc_type: opt.key })}
                      style={({ pressed }) => [
                        styles.typePill,
                        selected && styles.typePillSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.typePillText, selected && styles.typePillTextSelected]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.actionsRow}>
                <Pressable
                  onPress={() => saveRow(d)}
                  disabled={savingId === d.doc_id}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    savingId === d.doc_id && styles.btnDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  {savingId === d.doc_id ? (
                    <ActivityIndicator />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={16} color="#0F766E" />
                      <Text style={styles.actionBtnText}>Save</Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => deleteRow(d)}
                  disabled={deletingId === d.doc_id}
                  style={({ pressed }) => [
                    styles.dangerBtn,
                    deletingId === d.doc_id && styles.btnDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  {deletingId === d.doc_id ? (
                    <ActivityIndicator />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={16} color="#B42318" />
                      <Text style={styles.dangerBtnText}>Delete</Text>
                    </>
                  )}
                </Pressable>
              </View>

              <Text style={styles.pathNote} numberOfLines={1}>
                {cap(BUCKET)} · {d.storage_path}
              </Text>
            </View>
          ))
        )}

        <Text style={styles.footerNote}>
          Tip: keep file names simple. Paths are case-sensitive.
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  container: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    backgroundColor: "#fff",
  },

  pressed: { opacity: 0.85 },

  btnDisabled: { opacity: 0.6 },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  h1: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111",
  },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(13,148,136,0.10)",
    borderWidth: 1,
    borderColor: "rgba(13,148,136,0.25)",
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0F766E",
  },

  loadingWrap: {
    paddingVertical: 30,
    alignItems: "center",
  },

  emptyCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111",
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#666",
  },

  card: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },

  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    backgroundColor: "#fafafa",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: "800",
    color: "#111",
  },

  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },

  typePill: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    backgroundColor: "#fff",
  },
  typePillSelected: {
    borderColor: "rgba(13,148,136,0.35)",
    backgroundColor: "rgba(13,148,136,0.10)",
  },
  typePillText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#444",
  },
  typePillTextSelected: {
    color: "#0F766E",
  },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(13,148,136,0.10)",
    borderWidth: 1,
    borderColor: "rgba(13,148,136,0.25)",
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0F766E",
  },

  dangerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(180,35,24,0.08)",
    borderWidth: 1,
    borderColor: "rgba(180,35,24,0.18)",
  },
  dangerBtnText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#B42318",
  },

  pathNote: {
    marginTop: 10,
    fontSize: 11,
    fontWeight: "700",
    color: "#777",
  },

  footerNote: {
    marginTop: 14,
    fontSize: 12,
    fontWeight: "700",
    color: "#666",
  },
});