import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type EventDocType = "tech" | "rider" | "setlist" | "contracts" | "other";

type EventDocRow = {
  doc_id: string;
  title: string;
  doc_type: EventDocType | null;
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

function sanitizeFilename(name: string) {
  return name.replace(/[^\w.\-]+/g, "_").replace(/_+/g, "_");
}

function formatBytes(n?: number | null) {
  if (!n || n <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

async function confirmDelete(message: string) {
  if (Platform.OS === "web") {
    return window.confirm(message);
  }

  return new Promise<boolean>((resolve) => {
    Alert.alert("Confirm delete", message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Delete", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}

async function pickDocType(): Promise<EventDocType | null> {
  if (Platform.OS === "web") {
    const selected = window.prompt(
      "Document type: tech, rider, setlist, contracts, other",
      "other",
    );

    if (!selected) return null;

    if (["tech", "rider", "setlist", "contracts", "other"].includes(selected)) {
      return selected as EventDocType;
    }

    return "other";
  }

  return new Promise((resolve) => {
    Alert.alert("Document type", "Choose document type", [
      { text: "Tech", onPress: () => resolve("tech") },
      { text: "Rider", onPress: () => resolve("rider") },
      { text: "Set list", onPress: () => resolve("setlist") },
      { text: "Contracts", onPress: () => resolve("contracts") },
      { text: "Other", onPress: () => resolve("other") },
      { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
    ]);
  });
}

export default function EditEventDocumentsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [docs, setDocs] = useState<EventDocRow[]>([]);

  const docTypeOptions: { key: EventDocType; label: string }[] = [
    { key: "tech", label: "Tech" },
    { key: "rider", label: "Rider" },
    { key: "setlist", label: "Set list" },
    { key: "contracts", label: "Contracts" },
    { key: "other", label: "Other" },
  ];

  function updateLocal(docId: string, patch: Partial<EventDocRow>) {
    setDocs((prev) =>
      prev.map((d) => (d.doc_id === docId ? { ...d, ...patch } : d)),
    );
  }

  useEffect(() => {
    if (!id) return;
    loadDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadDocs() {
    if (!id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("event_documents")
      .select(
        "doc_id,title,doc_type,storage_bucket,storage_path,mime_type,size_bytes,created_at",
      )
      .eq("event_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      setLoading(false);
      Alert.alert("Error", error.message);
      return;
    }

    setDocs((data ?? []) as EventDocRow[]);
    setLoading(false);
  }

  async function onUpload() {
    if (!id) return;

    try {
      setUploading(true);

      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        setUploading(false);
        return;
      }

      const file = result.assets?.[0];
      if (!file?.uri) throw new Error("No file selected");

      const filename = sanitizeFilename(file.name ?? "document");

      const selectedDocType = await pickDocType();

      if (!selectedDocType) {
        setUploading(false);
        return;
      }

      const bucket = "event-docs";
      const storagePath = `events/${id}/${Date.now()}-${filename}`;

      const fileResponse = await fetch(file.uri);
      const arrayBuffer = await fileResponse.arrayBuffer();

      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error("Selected file is empty");
      }

      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(storagePath, arrayBuffer, {
          contentType: file.mimeType ?? undefined,
          upsert: false,
        });
      if (uploadErr) throw uploadErr;

      const { error: insertErr } = await supabase
        .from("event_documents")
        .insert({
          event_id: id,
          title: file.name ?? "Document",
          doc_type: selectedDocType,
          storage_bucket: bucket,
          storage_path: storagePath,
          mime_type: file.mimeType ?? null,
          size_bytes: arrayBuffer.byteLength,
          uploaded_by_member_id: null,
        });
      if (insertErr) throw insertErr;

      const { data: eventInfo } = await supabase
        .from("events")
        .select("event_date,event_type,venues(event_venue_name,city)")
        .eq("event_id", id)
        .single();

      const venueName =
        (eventInfo as any)?.venues?.event_venue_name ?? "Unknown venue";

      const eventLabel = eventInfo
        ? `${eventInfo.event_type ?? "Event"} · ${venueName} · ${eventInfo.event_date}`
        : "event";

      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            title: "GigSynq document added",
            body: `${selectedDocType.charAt(0).toUpperCase() + selectedDocType.slice(1)}: ${
              file.name ?? "A document"
            } has been added to ${eventLabel}.`,
            data: {
              type: "event_document_added",
              event_id: id,
              open: "documents",
            },
          },
        });
      } catch (notifyError) {
        console.log("Document push notification error:", notifyError);
      }

      setUploading(false);
      await loadDocs();
    } catch (e: any) {
      setUploading(false);
      Alert.alert("Upload failed", e?.message ?? "Please try again.");
    }
  }

  async function saveDocType(doc: EventDocRow) {
    try {
      setSavingId(doc.doc_id);

      const { error } = await supabase
        .from("event_documents")
        .update({
          doc_type: doc.doc_type ?? "other",
        })
        .eq("doc_id", doc.doc_id);

      if (error) throw error;
      Alert.alert("Saved", "Document type updated.");
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Please try again.");
    } finally {
      setSavingId(null);
    }
  }

  async function onDelete(doc: EventDocRow) {
    if (!id) return;

    const ok = await confirmDelete(
      `Delete "${doc.title}"? This cannot be undone.`,
    );
    if (!ok) return;

    try {
      setDeletingId(doc.doc_id);

      const { error: storageErr } = await supabase.storage
        .from(doc.storage_bucket)
        .remove([doc.storage_path]);

      if (storageErr) throw storageErr;

      const { error: dbErr } = await supabase
        .from("event_documents")
        .delete()
        .eq("doc_id", doc.doc_id);
      if (dbErr) throw dbErr;

      setDeletingId(null);
      await loadDocs();
    } catch (e: any) {
      setDeletingId(null);
      Alert.alert("Delete failed", e?.message ?? "Please try again.");
    }
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <Stack.Screen options={{ title: "Edit Documents" }} />
        <ActivityIndicator size="large" color="#333" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Edit Documents" }} />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Upload Event Document</Text>
          <Text style={styles.cardSub}>
            Uploads to Supabase Storage (event-docs) and creates an
            event_documents row.
          </Text>

          <TouchableOpacity
            style={[styles.primaryButton, uploading && { opacity: 0.6 }]}
            onPress={onUpload}
            disabled={uploading}
          >
            <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>
              {uploading ? "Uploading…" : "Pick & Upload"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.note}>
            Path format enforced: events/{`{event_id}`}/…
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Uploaded Documents</Text>
          <Text style={styles.cardSub}>
            These are the storage-backed docs for this event.
          </Text>

          {docs.length === 0 ? (
            <Text style={styles.emptyText}>No uploaded documents yet.</Text>
          ) : (
            <View style={styles.list}>
              {docs.map((d, idx) => {
                const last = idx === docs.length - 1;
                const size = formatBytes(d.size_bytes);

                return (
                  <View
                    key={d.doc_id}
                    style={[styles.row, last && styles.rowLast]}
                  >
                    <View style={styles.rowLeft}>
                      <View style={styles.docIcon}>
                        <Ionicons
                          name="document-text-outline"
                          size={16}
                          color={colors.primary}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.docTitle} numberOfLines={2}>
                          {d.title}
                        </Text>

                        <View style={styles.metaRow}>
                          <View style={styles.typeRow}>
                            {docTypeOptions.map((opt) => {
                              const selected =
                                (d.doc_type ?? "other") === opt.key;

                              return (
                                <Pressable
                                  key={opt.key}
                                  onPress={() =>
                                    updateLocal(d.doc_id, {
                                      doc_type: opt.key,
                                    })
                                  }
                                  style={[
                                    styles.docTypePill,
                                    selected && styles.docTypePillSelected,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.docTypePillText,
                                      selected &&
                                        styles.docTypePillTextSelected,
                                    ]}
                                  >
                                    {opt.label}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>

                          {size ? (
                            <Text style={styles.docMeta}>{size}</Text>
                          ) : null}
                        </View>
                      </View>
                    </View>

                   <View style={styles.actionRow}>
  <Pressable
    onPress={() => saveDocType(d)}
    disabled={savingId === d.doc_id}
    style={[styles.saveTypeBtn, savingId === d.doc_id && { opacity: 0.6 }]}
  >
    <Ionicons
  name={savingId === d.doc_id ? "checkmark-outline" : "save-outline"}
  size={16}
  color="#fff"
/>
    <Text style={styles.saveTypeBtnText}>
  {savingId === d.doc_id ? "Saving..." : "Save"}
</Text>
  </Pressable>

  <Pressable
    onPress={() => onDelete(d)}
    disabled={deletingId === d.doc_id}
    style={[styles.deleteTypeBtn, deletingId === d.doc_id && { opacity: 0.6 }]}
  >
    <Ionicons name="trash-outline" size={16} color={colors.danger ?? "#DC2626"} />
  </Pressable>
</View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => router.back()}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.pageBg,
  },
  container: {
    padding: 16,
    paddingBottom: 28,
    backgroundColor: colors.pageBg,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 6,
  },
  cardSub: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: colors.button,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  note: {
    marginTop: 10,
    fontSize: 12,
    color: colors.textMuted,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    paddingVertical: 6,
  },
  list: {
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  docIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#F2FAFA",
    alignItems: "center",
    justifyContent: "center",
  },
  docTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    flex: 1,
  },
  docTypePill: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 6,
    paddingVertical: Platform.OS === "android" ? 1 : 2,
    borderRadius: 999,
  },
  docTypePillSelected: {
    backgroundColor: "#E6F7F7",
    borderColor: "#0F766E",
  },
  docTypePillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#666",
    textTransform: "capitalize",
  },
  docTypePillTextSelected: {
    color: "#0F766E",
  },
  docMeta: {
    fontSize: 12,
    color: "#666",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  iconBtn: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 10,
  },
  saveTypeBtn: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  backgroundColor: colors.primary,
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 10,
},

saveTypeBtnText: {
  color: "#fff",
  fontSize: 12,
  fontWeight: "800",
},

deleteTypeBtn: {
  width: 34,
  height: 34,
  borderRadius: 10,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(220,38,38,0.08)",
},
  doneButton: {
    backgroundColor: colors.button,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  doneButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
});