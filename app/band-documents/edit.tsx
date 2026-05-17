// app/band-documents/edit.tsx

import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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

async function pickDocType(t: (key: string) => string): Promise<DocType | null> {
  if (Platform.OS === "web") {
    const selected = window.prompt(
      "Document type: tech, rider, setlist, contracts, other",
      "other",
    );
    if (!selected) return null;
    if (["tech", "rider", "setlist", "contracts", "other"].includes(selected)) {
      return selected as DocType;
    }
    return "other";
  }

  return new Promise((resolve) => {
    Alert.alert(t("bandDocsEdit.alert.documentTypeTitle"), t("bandDocsEdit.alert.documentTypeMessage"), [
      { text: t("bandDocsEdit.typeTech"), onPress: () => resolve("tech") },
      { text: t("bandDocsEdit.typeRider"), onPress: () => resolve("rider") },
      { text: t("bandDocsEdit.typeSetlist"), onPress: () => resolve("setlist") },
      { text: t("bandDocsEdit.typeContracts"), onPress: () => resolve("contracts") },
      { text: t("bandDocsEdit.typeOther"), onPress: () => resolve("other") },
      { text: t("common.cancel"), style: "cancel", onPress: () => resolve(null) },
    ]);
  });
}

export default function BandDocumentsEditScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

    const [bandId, setBandId] = useState<string | null>(null);
  const [docs, setDocs] = useState<BandDocRow[]>([]);
  const [typePickerDoc, setTypePickerDoc] = useState<BandDocRow | null>(null);

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
        .select(
          "doc_id, band_id, title, doc_type, storage_bucket, storage_path, created_at",
        )
        .eq("band_id", bId)
        .order("doc_type", { ascending: true })
        .order("title", { ascending: true });

      if (error) throw error;

      setDocs((data ?? []) as BandDocRow[]);
    } catch (e: any) {
      console.log("band docs edit load error", e);
      Alert.alert(t("bandDocsEdit.alert.errorTitle"), e?.message ?? t("bandDocsEdit.alert.failedToLoadDocuments"));
      setDocs([]);
      setBandId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const docTypeOptions: { key: DocType; label: string }[] = useMemo(
    () => [
      { key: "tech", label: t("bandDocsEdit.typeTech") },
      { key: "rider", label: t("bandDocsEdit.typeRider") },
      { key: "setlist", label: t("bandDocsEdit.typeSetlist") },
      { key: "contracts", label: t("bandDocsEdit.typeContracts") },
      { key: "other", label: t("bandDocsEdit.typeOther") },
    ],
    [t],
  );

  function updateLocal(docId: string, patch: Partial<BandDocRow>) {
    setDocs((prev) =>
      prev.map((d) => (d.doc_id === docId ? { ...d, ...patch } : d)),
    );
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
      Alert.alert(t("bandDocsEdit.alert.errorTitle"), e?.message ?? t("bandDocsEdit.alert.failedToSave"));
    } finally {
      setSavingId(null);
    }
  }
  async function changeDocType(doc: BandDocRow, docType: DocType) {
    updateLocal(doc.doc_id, { doc_type: docType });
    setTypePickerDoc(null);
    await saveRow({ ...doc, doc_type: docType });
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
      Alert.alert(t("bandDocsEdit.alert.deleteFailedTitle"), e?.message ?? t("bandDocsEdit.alert.failedToDelete"));
    } finally {
      setDeletingId(null);
    }
  }
  async function openDoc(doc: BandDocRow) {
    try {
      const { data, error } = await supabase.storage
        .from(doc.storage_bucket)
        .createSignedUrl(doc.storage_path, 3600);

      if (error) throw error;
      if (!data?.signedUrl) throw new Error("No download URL");

      await WebBrowser.openBrowserAsync(data.signedUrl);
    } catch (e: any) {
      console.log("open doc error", e);
      Alert.alert(t("bandDocsEdit.alert.openFailedTitle"), e?.message ?? t("bandDocsEdit.alert.couldNotOpenDocument"));
    }
  }
  async function uploadNew() {
    if (!bandId) {
      Alert.alert(t("bandDocsEdit.alert.uploadFailedTitle"), t("bandDocsEdit.alert.noBandFoundForUser"));
      return;
    }

    setUploading(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (res.canceled) {
        Alert.alert(t("bandDocsEdit.alert.uploadTitle"), t("bandDocsEdit.alert.cancelled"));
        return;
      }

      const file = res.assets?.[0];
      if (!file) {
        Alert.alert(t("bandDocsEdit.alert.uploadFailedTitle"), t("bandDocsEdit.alert.noFileFromPicker"));
        return;
      }

      const filename = file.name || "document";
      const selectedDocType = await pickDocType(t);

      if (!selectedDocType) {
        setUploading(false);
        return;
      }
      const path = `bands/${bandId}/${Date.now()}-${filename}`;

      // 1) Read file data
      const response = await fetch(file.uri);
      const blob = await response.blob();

      if (!blob || blob.size === 0) {
        throw new Error("Selected file is empty");
      }

      // 2) Upload to storage

      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        name: filename,
        type: file.mimeType ?? "application/octet-stream",
      } as any);

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, formData as any, {
          upsert: true,
        });

      if (upErr) {
        console.log("UPLOAD ERROR:", upErr);
        Alert.alert(t("bandDocsEdit.alert.uploadFailedTitle"), upErr.message);
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
        band_id: bandId,
        title,
        doc_type: selectedDocType,
        storage_bucket: BUCKET,
        storage_path: path,
      });

      if (insErr) {
        console.log("INSERT ERROR:", insErr);
        Alert.alert(t("bandDocsEdit.alert.uploadSavedDbInsertFailed"), insErr.message);
        return;
      }

      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            title: "GigSynq band document added",
            body: `${selectedDocType.charAt(0).toUpperCase() + selectedDocType.slice(1)} document added: ${file.name ?? "A document"}.`,
            data: {
  type: "band_document_added",
  open: "band_documents",
},
          },
        });
      } catch (notifyError) {
        console.log("Band document push notification error:", notifyError);
      }

      router.back();
      Alert.alert(t("bandDocsEdit.alert.uploadedTitle"), filename);
    } catch (e: any) {
      console.log("upload doc error", e);
      Alert.alert(t("bandDocsEdit.alert.uploadFailedTitle"), e?.message ?? t("bandDocsEdit.alert.couldNotUploadDocument"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t("bandDocsEdit.title"),
          headerStyle: { backgroundColor: "#0D9488" },
          headerTintColor: "#fff",
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={styles.headerBtn}
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>
          <Text style={styles.h1}>{t("bandDocsEdit.sectionTitle")}</Text>

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
                <Ionicons
                  name="cloud-upload-outline"
                  size={16}
                  color="#0F766E"
                />
                <Text style={styles.primaryBtnText}>{t("bandDocsEdit.upload")}</Text>
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
            <Text style={styles.emptyTitle}>{t("bandDocsEdit.emptyTitle")}</Text>
            <Text style={styles.emptyText}>
              {t("bandDocsEdit.emptyText")}
            </Text>
          </View>
        ) : (
          docs.map((d) => (
            <View key={d.doc_id} style={styles.card}>
                            <View style={styles.docHeaderRow}>
                <Pressable onPress={() => openDoc(d)} style={styles.docIcon}>
                  <Ionicons name="document-text-outline" size={24} color="#0F766E" />
                </Pressable>

                <Pressable onPress={() => openDoc(d)} style={styles.docTitleWrap}>
                  <Text style={styles.docTitle} numberOfLines={2}>
                    {d.title || t("bandDocsEdit.placeholderTitle")}
                  </Text>
                </Pressable>
              </View>

                            <Pressable
                onPress={() => setTypePickerDoc(d)}
                style={({ pressed }) => [
                  styles.typeBadge,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.typeBadgeText}>
                  {docTypeOptions.find((opt) => opt.key === (d.doc_type ?? "other"))?.label}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#0F766E" />
              </Pressable>

                <View style={styles.actionsRowCompact}>
                                <Pressable
                  onPress={() => openDoc(d)}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    name="download-outline"
                    size={20}
                    color="#0F766E"
                  />
                </Pressable>

                <Pressable
                  onPress={() => deleteRow(d)}
                  disabled={deletingId === d.doc_id}
                  style={({ pressed }) => [
                    styles.deleteIconBtn,
                    deletingId === d.doc_id && styles.btnDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  {deletingId === d.doc_id ? (
                    <ActivityIndicator />
                  ) : (
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color="#B42318"
                    />
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
          {t("bandDocsEdit.footerNote")}
        </Text>
      </ScrollView>
            <Modal
        visible={!!typePickerDoc}
        transparent
        animationType="slide"
        onRequestClose={() => setTypePickerDoc(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setTypePickerDoc(null)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>
              Change Document Type
            </Text>

            {typePickerDoc &&
              docTypeOptions.map((opt) => {
                const selected =
                  (typePickerDoc.doc_type ?? "other") === opt.key;

                return (
                  <Pressable
                    key={opt.key}
                    onPress={() =>
                      changeDocType(typePickerDoc, opt.key)
                    }
                    style={({ pressed }) => [
                      styles.modalOption,
                      selected && styles.modalOptionSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        selected && styles.modalOptionTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>

                    {selected && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color="#0F766E"
                      />
                    )}
                  </Pressable>
                );
              })}
          </View>
        </Pressable>
      </Modal>
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
  docHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  docIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(13,148,136,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  docTitleWrap: {
    flex: 1,
  },

  docTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111",
  },
    typeBadge: {
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(13,148,136,0.10)",
    borderWidth: 1,
    borderColor: "rgba(13,148,136,0.20)",
  },

  typeBadgeText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0F766E",
  },

  actionsRowCompact: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
  },

  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(13,148,136,0.10)",
    borderWidth: 1,
    borderColor: "rgba(13,148,136,0.20)",
  },

  deleteIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(180,35,24,0.08)",
    borderWidth: 1,
    borderColor: "rgba(180,35,24,0.18)",
  },
    modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.30)",
  },

  modalSheet: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  modalHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D0D5DD",
    marginBottom: 18,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111",
    marginBottom: 14,
  },

  modalOption: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    backgroundColor: "#fff",
  },

  modalOptionSelected: {
    backgroundColor: "rgba(13,148,136,0.10)",
    borderColor: "rgba(13,148,136,0.25)",
  },

  modalOptionText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#333",
  },

  modalOptionTextSelected: {
    color: "#0F766E",
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
