import { supabase } from "@/lib/supabase";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type BandMemberRow = {
  member_id: string;
  display_name: string | null;
  email: string | null;
  band_role: string | null;
  band_positions: string[] | null;
  is_active: boolean | null;
  is_admin: boolean | null;
  is_dep: boolean | null;
};

export default function BandMembersScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<BandMemberRow[]>([]);

  const loadMembers = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("band_members")
      .select(
  "member_id, display_name, email, band_role, band_positions, band_positions_other, is_active, is_admin, is_dep"
)
      .eq("is_active", true)
      .order("display_name", { ascending: true });

    if (error) {
      console.log("loadMembers error", error);
      setMembers([]);
      setLoading(false);
      return;
    }

    setMembers((data as BandMemberRow[]) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
  useCallback(() => {
    loadMembers();
    return () => {};
  }, [loadMembers])
);

  return (
    <>
      <Stack.Screen options={{ title: "Band & Crew" }} />

      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.subtitle}>Active members</Text>

          <Pressable style={styles.addButton} onPress={() => router.push("/band/add")}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <FlatList
            data={members}
            keyExtractor={(item) => item.member_id}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => {
              const presetPositions = item.band_positions ?? [];
const customPositions = (item as any).band_positions_other ?? [];
const allPositions = [...presetPositions, ...customPositions].filter(Boolean);
const positions = allPositions.length > 0 ? allPositions.join(", ") : "";

              return (
  <Pressable
    style={styles.row}
    onPress={() => router.push(`/band/edit?id=${item.member_id}` as any)}
  >
    <View style={styles.left}>
      <Text style={styles.name}>{item.display_name ?? "Unnamed"}</Text>

      <Text style={styles.meta}>
        {(item.band_role ?? "").trim()}
        {positions ? ` • ${positions}` : ""}
      </Text>

      {item.email ? <Text style={styles.meta2}>{item.email}</Text> : null}
    </View>

    <Text style={styles.badge}>{item.is_dep ? "Dep" : item.is_admin ? "Admin" : ""}</Text>
  </Pressable>
);
            }}
            ListEmptyComponent={<Text style={styles.empty}>No active members yet.</Text>}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  subtitle: { fontSize: 14, fontWeight: "600", color: "#333" },
  addButton: {
    backgroundColor: "#009999",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  addButtonText: { color: "#fff", fontWeight: "700" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  row: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  left: { flex: 1, paddingRight: 8 },
  name: { fontSize: 16, fontWeight: "700", color: "#111" },
  meta: { marginTop: 2, fontSize: 13, color: "#444" },
  meta2: { marginTop: 2, fontSize: 12, color: "#666" },
  badge: { fontSize: 12, fontWeight: "700", color: "#009999" },
  separator: { height: 10 },
  empty: { marginTop: 20, color: "#666" },
});