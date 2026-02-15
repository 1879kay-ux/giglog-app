import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

    useEffect(() => {
        fetchVenues();
    }, []);

    const fetchVenues = async () => {
        try {
            setLoading(true);
            setError(null);

            // Log current Supabase auth/session to verify anon key loaded
            try {
                const sessionRes = await supabase.auth.getSession();
                console.log('supabase.getSession ->', sessionRes);
            } catch (sessErr) {
                console.warn('supabase.getSession error ->', sessErr);
            }

            // Query the correct columns for your schema
            const query = "venue_id,event_venue_name,city,postcode";
            console.log('Fetching venues with select:', query);

            const { data, error: fetchError } = await supabase
                .from('venues')
                .select(query)
                .order('event_venue_name', { ascending: true });

            console.log('Ordering applied: event_venue_name ASC');

            console.log('Supabase response data:', data);
            console.log('Supabase response error:', fetchError);

            if (fetchError) {
                // If RLS or other permission issues occur, Supabase returns an error
                throw fetchError;
            }

            setVenues((data as Venue[]) || []);
        } catch (err) {
            console.error('fetchVenues caught error ->', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch venues');
        } finally {
            setLoading(false);
        }
    };

    const handleVenuePress = (venueId: string) => {
        router.push({ pathname: '/venue/[id]', params: { id: venueId } });
    };

    const renderVenueCard = ({ item }: { item: Venue }) => (
        <TouchableOpacity style={styles.card} onPress={() => handleVenuePress(item.venue_id)}>
            <View style={styles.content}>
                <Text style={styles.name}>{item.event_venue_name}</Text>
                <Text style={styles.city}>{item.city}</Text>
                {item.postcode ? <Text style={styles.postcode}>{item.postcode}</Text> : null}
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
        <View style={styles.container}>
            <Text style={styles.countText}>{venues.length} venues</Text>
            <FlatList
                data={venues}
                keyExtractor={(item) => item.venue_id}
                renderItem={renderVenueCard}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    listContent: {
        padding: 12,
    },
    card: {
        marginBottom: 16,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    image: {
        width: '100%',
        height: 200,
        backgroundColor: '#e0e0e0',
    },
    content: {
        padding: 12,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    city: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    postcode: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#d32f2f',
        marginBottom: 16,
        textAlign: 'center',
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#0000ff',
        borderRadius: 6,
    },
    retryText: {
        color: '#fff',
        fontWeight: '600',
    },
    countText: {
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 6,
        fontSize: 14,
        color: '#333',
        fontWeight: '600',
    },
});