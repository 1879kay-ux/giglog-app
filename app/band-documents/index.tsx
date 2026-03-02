// app/band-documents/index.tsx

import { openDoc, shareDoc } from "@/lib/docs";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type BandDocRow = {
  doc_id: string;
  title: string | null;
  doc_type: string | null; // e.g. "tech"
};

export default function BandDocumentsScreen() {
  const router = useRouter();

  const [isAdminMode, setIsAdminMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<BandDocRow[]>([]);

  const loadAdminMode = useCallback(async () => {
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;

      const userId = userData.user?.id;
      if (!userId) {
        setIsAdminMode(false);
        return;
      }

      const { data, error } = await supabase
        .from("band_members")
        .select("admin_mode_enabled")
        .eq("auth_user_id", userId)
        .maybeSingle();

      if (error) throw error;

      setIsAdminMode(!!(data as any)?.admin_mode_enabled);
    } catch (e) {
      console.log("admin mode load error", e);
      setIsAdminMode(false);
    }
  }, []);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("band_documents")
        .select("doc_id, title, doc_type")
        .order("doc_type", { ascending: true })
        .order("title", { ascending: true });

      if (error) throw error;
      setDocs((data ?? []) as BandDocRow[]);
    } catch (e: any) {
      console.log("band docs load error", e);
      Alert.alert("Error", e?.message ?? "Failed to load documents");
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // IMPORTANT: refresh both docs + admin mode every time screen focuses
      loadAdminMode();
      loadDocs();
    }, [loadAdminMode, loadDocs])
  );

  const grouped = useMemo(() => {
    const map = new Map<string, BandDocRow[]>();
    for (const d of docs) {
      const key = (d.doc_type ?? "Other").trim() || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }

    return Array.from(map.entries()).map(([docType, items]) => {
      const label =
        docType.toLowerCase() === "tech"
          ? "Tech"
          : docType.charAt(0).toUpperCase() + docType.slice(1);

      return { category: label, items };
    });
  }, [docs]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Band Docs",
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={() => router.push("/")} hitSlop={10} style={styles.headerBtn}>
              <Ionicons name="home-outline" size={22} color="#fff" />
            </Pressable>
          ),
          headerStyle: { backgroundColor: "#0D9488" },
          headerTintColor: "#fff",
        }}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Documents</Text>
            <Text style={styles.sectionSub}>{docs.length}</Text>
          </View>

          {isAdminMode ? (
            <Pressable
              onPress={() => router.push("/band-documents/edit")}
              style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
            >
              <Ionicons name="create-outline" size={16} color="#0F766E" />
              <Text style={styles.editBtnText}>Edit</Text>
            </Pressable>
          ) : (
            <View style={{ width: 72 }} />
          )}
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator />
          </View>
        ) : docs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No documents yet</Text>
            <Text style={styles.emptyText}>Upload band docs like tech specs, riders, set lists.</Text>
          </View>
        ) : (
          grouped.map(({ category, items }) => (
            <View key={category} style={{ marginTop: 12 }}>
              <Text style={styles.groupTitle}>{category}</Text>

              {items.map((item) => (
                <Pressable
                  key={item.doc_id}
                  style={({ pressed }) => [styles.docRow, pressed && styles.pressed]}
                  onPress={() => openDoc("band", item.doc_id)}
                >
                  <View style={styles.docRowLeft}>
                    <Text style={styles.docTitle} numberOfLines={1}>
                      {item.title ?? "Untitled"}
                    </Text>
                    <Text style={styles.docHint}>Tap to open</Text>
                  </View>

                  <View style={styles.docRowRight}>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        shareDoc("band", item.doc_id, item.title ?? "Document");
                      }}
                      hitSlop={10}
                      style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                    >
                      <Ionicons name="share-outline" size={20} color="#0F766E" />
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </View>
          ))
        )}

        <Text style={styles.footerNote}>
          Sharing creates a temporary link that expires automatically.
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
    paddingBottom: 24,
    backgroundColor: "#fff",
  },

  pressed: {
    opacity: 0.85,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111",
  },

  sectionSub: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "800",
    color: "#666",
  },

  editBtn: {
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

  editBtnText: {
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

  groupTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0F766E",
    marginBottom: 8,
    marginLeft: 2,
  },

  docRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    marginBottom: 10,
  },

  docRowLeft: {
    flex: 1,
    paddingRight: 12,
  },

  docRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  docTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111",
  },

  docHint: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "#666",
  },

  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(13,148,136,0.10)",
  },

  iconBtnPressed: {
    opacity: 0.75,
  },

  footerNote: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "#666",
  },
});