import { useCurrentMember } from "@/components/auth/CurrentMemberContext";
import ActionButton from "@/components/ui/ActionButton";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface Venue {
  venue_id: string;
  event_venue_name: string;
  city: string;
  postcode?: string;
}

export default function VenuesScreen() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const { isAdmin, adminModeEnabled } = useCurrentMember() as any;
  const canEdit = !!isAdmin && !!adminModeEnabled;

  const fetchVenues = async () => {
    try {
      setLoading(true);
      setError(null);

      const query = "venue_id,event_venue_name,city,postcode";

      const { data, error: fetchError } = await supabase
        .from("venues")
        .select(query)
        .order("event_venue_name", { ascending: true });

      if (fetchError) throw fetchError;

      setVenues((data as Venue[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch venues");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchVenues();
    }, [])
  );

  const handleVenuePress = (venueId: string) => {
    router.push(`/venue/${venueId}`);
  };

  const filteredVenues = venues.filter((v) => {
    const haystack = `${v.event_venue_name} ${v.city} ${v.postcode ?? ""}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const renderVenueCard = ({ item }: { item: Venue }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleVenuePress(item.venue_id)}>
      <View style={styles.cardRow}>
        <View style={styles.content}>
          <Text style={styles.name}>{item.event_venue_name}</Text>
          <Text style={styles.city}>{item.city}</Text>
          {item.postcode ? <Text style={styles.postcode}>{item.postcode}</Text> : null}
        </View>
        <View style={styles.iconContainer}>
          <Ionicons name="chevron-forward-outline" size={24} color="#999" />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchVenues}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: "Venues",
          headerLeft: () => (
            <View
              style={Platform.select({
                ios: {
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  justifyContent: "center",
                  alignItems: "center",
                },
                default: { paddingLeft: 12 },
              })}
            >
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back-outline" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          ),
          headerRight: () => (
            <View
              style={Platform.select({
                ios: {
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  justifyContent: "center",
                  alignItems: "center",
                },
                default: { paddingRight: 12 },
              })}
            >
              <TouchableOpacity onPress={() => router.push("/")}>
                <Ionicons name="home-outline" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <View style={styles.container}>
        {/* SEARCH BAR */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#666" />

          <TextInput
            style={styles.searchInput}
            placeholder="Search venues..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
          />

          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* ADD VENUE BUTTON (admin + admin mode) */}
        {canEdit ? (
          <ActionButton
            label="Add Venue"
            icon="add-circle-outline"
            onPress={() => router.push("/venue/add")}
            style={styles.addVenueButton}
          />
        ) : null}

        <Text style={styles.countText}>{filteredVenues.length} venues</Text>

        <FlatList
          data={filteredVenues}
          keyExtractor={(item) => item.venue_id}
          renderItem={renderVenueCard}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#333",
  },

  // Applied to ActionButton via `style` prop
  addVenueButton: {
    alignSelf: "center",
    marginTop: 10,
    paddingHorizontal: 18,
  },

  listContent: {
    padding: 12,
  },
  card: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconContainer: {
    paddingRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: 12,
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  city: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  postcode: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#d32f2f",
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#0000ff",
    borderRadius: 6,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
  countText: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 6,
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
});