import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type ActRow = {
  act_id: string;
  act_name: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  is_default: boolean | null;
  created_at: string | null;
};

export default function ActsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { bandId } = useCurrentMember() as any;

  const [loading, setLoading] = useState(true);
  const [acts, setActs] = useState<ActRow[]>([]);

  const loadActs = useCallback(async () => {
    if (!bandId) {
      setActs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("acts")
        .select(`
          act_id,
          act_name,
          contact_name,
          phone,
          email,
          is_default,
          created_at
        `)
        .eq("band_id", bandId)
        .order("act_name", { ascending: true });

      if (error) throw error;
      setActs((data ?? []) as ActRow[]);
    } catch (e) {
      console.log("acts load error", e);
      setActs([]);
    } finally {
      setLoading(false);
    }
  }, [bandId]);

  useFocusEffect(
    useCallback(() => {
      loadActs();
    }, [loadActs]),
  );

  const renderAct = ({ item }: { item: ActRow }) => (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{item.act_name ?? "Untitled"}</Text>
        {item.is_default ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t("acts.default")}</Text>
          </View>
        ) : null}
      </View>

      {item.contact_name ? <Text style={styles.detail}>{item.contact_name}</Text> : null}
      {item.phone ? <Text style={styles.detail}>{item.phone}</Text> : null}
      {item.email ? <Text style={styles.detail}>{item.email}</Text> : null}
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: t("acts.title"),
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={styles.headerBtn}
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/")}
              hitSlop={10}
              style={styles.headerBtn}
            >
              <Ionicons name="home-outline" size={22} color="#fff" />
            </Pressable>
          ),
          headerStyle: { backgroundColor: "#0D9488" },
          headerTintColor: "#fff",
        }}
      />

      <View style={styles.container}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : acts.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>{t("acts.empty")}</Text>
          </View>
        ) : (
          <FlatList
            data={acts}
            keyExtractor={(item) => item.act_id}
            renderItem={renderAct}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
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
    flex: 1,
    backgroundColor: "#fff",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e7e7e7",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 6,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
  },
  badge: {
    backgroundColor: "#E7F8F5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "700",
  },
  detail: {
    fontSize: 14,
    color: "#444",
    marginTop: 2,
  },
});
