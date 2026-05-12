import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Venue } from "../../types/venue";

export default function VenueRow({
  venue,
  onPress,
}: {
  venue: Venue;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.row}>
      <View>
        <Text style={styles.name}>{venue.event_venue_name}</Text>
        <Text style={styles.meta}>
          {venue.city} · {venue.postcode}
        </Text>
      </View>
      <Text style={styles.chevron}>{">"}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  meta: {
    color: "#666",
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    color: "#999",
  },
});
