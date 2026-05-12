import { supabase } from "@/lib/supabase";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = { eventId: string };

type Row = {
  event_date: string;
  event_type: string | null;
  event_status: string | null;
  venue_id: string | null;
};

type VenueRow = {
  event_venue_name: string | null;
  city: string | null;
};

function formatEventDate(dateString: string) {
  const d = new Date(dateString);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function EditEventHeader({ eventId }: Props) {
  const [loading, setLoading] = useState(true);
  const [eventDate, setEventDate] = useState<string | null>(null);
  const [eventType, setEventType] = useState<string | null>(null);
  const [eventStatus, setEventStatus] = useState<string | null>(null);
  const [venueName, setVenueName] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);

      const { data, error } = await supabase
        .from("events")
        .select("event_date,event_type,event_status,venue_id")
        .eq("event_id", eventId)
        .single();

      if (!alive) return;

      if (error || !data) {
        setLoading(false);
        return;
      }

      const row = data as Row;

      setEventDate(row.event_date);
      setEventType(row.event_type);
      setEventStatus(row.event_status);

      if (row.venue_id) {
        const { data: v } = await supabase
          .from("venues")
          .select("event_venue_name,city")
          .eq("venue_id", row.venue_id)
          .single();

        if (!alive) return;

        const venue = v as VenueRow | null;
        setVenueName(venue?.event_venue_name ?? null);
        setCity(venue?.city ?? null);
      }

      setLoading(false);
    }

    load();
    return () => {
      alive = false;
    };
  }, [eventId]);

  if (loading) return null;

  return (
    <View style={styles.wrap}>
      {eventDate ? (
        <Text style={styles.date}>{formatEventDate(eventDate)}</Text>
      ) : null}
      <Text style={styles.venue}>
        {venueName ?? "Event"}
        {city ? `, ${city}` : ""}
      </Text>
      <Text style={styles.meta}>
        {eventType ?? "Event"}
        {eventStatus ? `, ${eventStatus}` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  date: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: "#111",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  venue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    marginBottom: 2,
  },
  meta: {
    fontSize: 14,
    color: "#444",
    fontWeight: "600",
  },
});
