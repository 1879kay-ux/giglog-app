import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  eventId: string;

  venueAddress?: string | null;
  venueCity?: string | null;
  venuePostcode?: string | null;

  // per-event override
  departureAddress?: string | null;
  departurePostcode?: string | null;
};

type ProfileRow = {
  id: string;
  default_departure_address: string | null;
  default_departure_postcode: string | null;
};

function enc(s: string) {
  return encodeURIComponent(s.trim());
}

function clean(v?: string | null) {
  const t = (v ?? '').trim();
  return t.length ? t : null;
}

export default function TravelSection({
  eventId,
  venueAddress,
  venueCity,
  venuePostcode,
  departureAddress,
  departurePostcode,
}: Props) {
  const router = useRouter();
  const goEdit = () => router.push(`/events/${eventId}/edit/travel`);
  const goDefaults = () => router.push('/settings/travel');


  const [profile, setProfile] = useState<ProfileRow | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data: auth, error: authErr } = await supabase.auth.getUser();
      const userId = auth?.user?.id;

      if (!alive) return;

      if (authErr || !userId) {
        setProfile(null);
        return;
      }

      const { data: p } = await supabase
        .from('profiles')
        .select('id, default_departure_address, default_departure_postcode')
        .eq('id', userId)
        .maybeSingle();

      if (!alive) return;
      setProfile((p as ProfileRow) ?? null);
    })();

    return () => {
      alive = false;
    };
  }, []);

  const venueDest = useMemo(() => {
    return (
      [clean(venueAddress), clean(venueCity), clean(venuePostcode)].filter(Boolean).join(', ') ||
      clean(venuePostcode) ||
      ''
    );
  }, [venueAddress, venueCity, venuePostcode]);

  // effective departure = event override first, otherwise profile default
  const effectiveDepartureAddress = clean(departureAddress) ?? clean(profile?.default_departure_address) ?? null;
  const effectiveDeparturePostcode = clean(departurePostcode) ?? clean(profile?.default_departure_postcode) ?? null;

  const departureOrigin = useMemo(() => {
    return (
      [effectiveDepartureAddress, effectiveDeparturePostcode].filter(Boolean).join(', ') ||
      effectiveDeparturePostcode ||
      ''
    );
  }, [effectiveDepartureAddress, effectiveDeparturePostcode]);

  async function openUrl(url: string) {
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) throw new Error('cannot open');
      await Linking.openURL(url);
    } catch {
      Alert.alert("Can't open maps", 'Check the address/postcode and try again.');
    }
  }

  function openToVenue(app: 'apple' | 'google' | 'waze') {
    if (!venueDest) {
      Alert.alert('Venue location missing', 'Add an address or postcode to the venue.');
      return;
    }

    const d = enc(venueDest);

    const url =
      app === 'apple'
        ? `http://maps.apple.com/?daddr=${d}&dirflg=d`
        : app === 'google'
        ? `https://www.google.com/maps/dir/?api=1&destination=${d}&travelmode=driving`
        : `https://waze.com/ul?q=${d}&navigate=yes`;

    openUrl(url);
  }

  function openFromDeparture(app: 'apple' | 'google' | 'waze') {
    if (!departureOrigin) {
      Alert.alert(
        'Departure location not set',
        'Set a default departure location in your profile, or tap the pencil to set one for this event.'
      );
      return;
    }
    if (!venueDest) {
      Alert.alert('Venue location missing', 'Add an address or postcode to the venue.');
      return;
    }

    const o = enc(departureOrigin);
    const d = enc(venueDest);

    const url =
      app === 'apple'
        ? `http://maps.apple.com/?saddr=${o}&daddr=${d}&dirflg=d`
        : app === 'google'
        ? `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}&travelmode=driving`
        : `https://waze.com/ul?q=${d}&navigate=yes`;

    openUrl(url);
  }

  const showingProfileDefault =
    !clean(departureAddress) &&
    !clean(departurePostcode) &&
    (!!effectiveDepartureAddress || !!effectiveDeparturePostcode);

  return (
    <View style={styles.wrap}>
      {/* Departure */}
      <View style={styles.travelRow}>
        <View style={styles.blockHeader}>
          <Text style={styles.travelLabel}>Departure Location → Venue</Text>

          <Pressable onPress={goEdit} hitSlop={10} style={styles.headerBtn}>
            <Ionicons name="create-outline" size={18} color="#008080" />
          </Pressable>
        </View>

        <View style={styles.travelButtonRow}>
          <Chip label="Apple" onPress={() => openFromDeparture('apple')} />
          <Chip label="Google" onPress={() => openFromDeparture('google')} />
          <Chip label="Waze" onPress={() => openFromDeparture('waze')} />
        </View>

        <View style={styles.locationBox}>
          <View style={styles.locationHeaderRow}>
            <Text style={styles.locationTitle}>Departure Location</Text>
            {showingProfileDefault ? (
  <Pressable onPress={goDefaults} style={styles.badge}>
    <Text style={styles.badgeText}>Default</Text>
  </Pressable>
) : null}

          </View>

          <Text style={styles.locationText}>{effectiveDepartureAddress ?? 'Not set'}</Text>
          <Text style={styles.locationText}>{effectiveDeparturePostcode ?? ''}</Text>
        </View>
      </View>

      {/* Current location */}
      <View style={styles.travelRow}>
        <Text style={styles.travelLabel}>Current Location → Venue</Text>

        <View style={styles.travelButtonRow}>
          <Chip label="Apple" onPress={() => openToVenue('apple')} />
          <Chip label="Google" onPress={() => openToVenue('google')} />
          <Chip label="Waze" onPress={() => openToVenue('waze')} />
        </View>
      </View>

      {/* Venue */}
      <View style={styles.locationBox}>
        <Text style={styles.locationTitle}>Venue Location</Text>
        <Text style={styles.locationText}>{venueAddress ?? ''}</Text>
        <Text style={styles.locationText}>
          {venueCity ?? ''} {venuePostcode ?? ''}
        </Text>
      </View>
    </View>
  );
}

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.chip} android_ripple={{ color: '#d9f0f0' }}>
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 4,
  },

  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#E9F6F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  travelRow: {
    marginBottom: 14,
  },

  travelLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111',
  },

  travelButtonRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },

  chip: {
    backgroundColor: '#008080',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },

  chipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },

  locationBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
  },

  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  locationTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#333',
  },

  badge: {
    backgroundColor: '#E9F6F6',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  badgeText: {
    color: '#008080',
    fontSize: 11,
    fontWeight: '900',
  },

  locationText: {
    fontSize: 13,
    color: '#555',
  },
});
