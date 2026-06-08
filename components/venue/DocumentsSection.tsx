import InfoCard from "@/components/InfoCard";
import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import { SIGNED_URL_TTL } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

type DocumentsSectionProps = {
  eventId: string;
};

type EventDocRow = {
  doc_id: string;
  title: string;
  doc_type: string | null;
  storage_bucket: string;
  storage_path: string;
  created_at: string;
};

type StorageDocItem = {
  docId: string;
  label: string;
  bucket: string;
  path: string;
  sub?: string;
};

export default function DocumentsSection({ eventId }: DocumentsSectionProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAdmin, adminModeEnabled } = useCurrentMember();
  const canEdit = isAdmin && adminModeEnabled;

  const goEdit = () => router.push(`/events/${eventId}/edit/documents`);

  const [docs, setDocs] = useState<StorageDocItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("event_documents")
        .select("doc_id,title,doc_type,storage_bucket,storage_path,created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        setLoading(false);
        setDocs([]);
        Alert.alert("Docs error", error.message);
        return;
      }

      const rows = (data ?? []) as EventDocRow[];
      setDocs(
        rows.map((r) => ({
          docId: r.doc_id,
          label: r.title,
          bucket: r.storage_bucket,
          path: r.storage_path,
          sub: r.doc_type ?? undefined,
        })),
      );

      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const openStorageDoc = async (d: StorageDocItem) => {
    try {
      const { data, error } = await supabase.storage
        .from(d.bucket)
        .createSignedUrl(d.path, SIGNED_URL_TTL); // 7 days (configured in lib/storage)

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || "Failed to create signed URL");
      }

      await Linking.openURL(data.signedUrl);
    } catch (e: any) {
      Alert.alert("Can't open document", e?.message ?? "Please try again.");
    }
  };

  const shareStorageDoc = async (d: StorageDocItem) => {
    try {
      const { data, error } = await supabase.storage
        .from(d.bucket)
        .createSignedUrl(d.path, SIGNED_URL_TTL); // 7 days (configured in lib/storage)

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || "Failed to create signed URL");
      }

      await Share.share({
        message: data.signedUrl,
      });
    } catch (e: any) {
      Alert.alert("Can't share document", e?.message ?? "Please try again.");
    }
  };

  const HeaderRight = canEdit ? (
    <Pressable onPress={goEdit} hitSlop={10} style={styles.headerBtn}>
      <Ionicons name="create-outline" size={18} color={colors.primary} />
      <Text style={styles.headerBtnText}>{t("documentsSection.edit")}</Text>
    </Pressable>
  ) : undefined;

  const isEmpty = !loading && docs.length === 0;

  return (
    <InfoCard title={t("documentsSection.documents")} right={HeaderRight}>
      {isEmpty ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="documents-outline"
              size={22}
              color={colors.primary}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.emptyTitle}>{t("documentsSection.noDocumentsYet")}</Text>
            <Text style={styles.emptySub}>{t("documentsSection.uploadInAdminMode")}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.list}>
          {docs.map((d, idx) => {
            const last = idx === docs.length - 1;

            return (
              <Pressable
                key={d.docId}
                onPress={() => openStorageDoc(d)}
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
                    <Text style={styles.label}>{d.label}</Text>
                    {!!d.sub && (
                      <View style={styles.docTypePill}>
                        <Text style={styles.docTypePillText}>
                          {d.sub.charAt(0).toUpperCase() + d.sub.slice(1)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    shareStorageDoc(d);
                  }}
                  hitSlop={10}
                  style={styles.shareBtn}
                >
                  <Ionicons name="share-outline" size={18} color="#7a7a7a" />
                </Pressable>
              </Pressable>
            );
          })}

          {loading ? (
            <Text style={styles.loadingText}>Loading documents…</Text>
          ) : null}
        </View>
      )}
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#E9F6F6",
  },
  headerBtnText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 13,
  },

  emptyWrap: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    paddingVertical: 4,
  },
  emptyIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#E9F6F6",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111",
  },
  emptySub: {
    fontSize: 12,
    color: "#666",
    marginTop: 3,
    lineHeight: 16,
  },

  list: {
    marginTop: 2,
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
  label: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111",
  },
  docTypePill: {
    alignSelf: "flex-start",
    backgroundColor: "#E6F7F7",
    borderWidth: 1,
    borderColor: "#0F766E",
    paddingHorizontal: 6,
    paddingVertical: Platform.OS === "android" ? 1 : 2,
    borderRadius: 999,
    marginTop: 3,
  },

  docTypePillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0F766E",
    textTransform: "capitalize",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: "#666",
  },
  shareBtn: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 10,
  },
});
