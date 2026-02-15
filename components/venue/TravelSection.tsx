import InfoCard from '@/components/InfoCard';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type TravelSectionProps = {
  venue?: {
    address?: string | null;
    city?: string | null;
    postcode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
};

export default function TravelSection({ venue }: TravelSectionProps) {
  // Fallback to address if coordinates not available
  const address = venue?.address && venue?.city ? 
    `${venue.address}, ${venue.city}, ${venue.postcode || ''}` : 
    'Venue address';

  const lat = venue?.latitude || 51.5074;
  const lng = venue?.longitude || -0.1278;

  const handleMapNavigation = (mapService: 'apple' | 'google' | 'waze') => {
    let url = '';
    
    switch (mapService) {
      case 'apple':
        url = `http://maps.apple.com/?daddr=${lat},${lng}`;
        break;
      case 'google':
        url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        break;
      case 'waze':
        url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
        break;
    }

    Linking.openURL(url).catch(() => {
      console.error(`Failed to open ${mapService} maps`);
    });
  };

  return (
    <ScrollView style={styles.container}>
      <InfoCard title="Homebase → Venue">
        <Text style={styles.subtitle}>Open in:</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => handleMapNavigation('apple')}
          >
            <Text style={styles.buttonText}>Apple Maps</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => handleMapNavigation('google')}
          >
            <Text style={styles.buttonText}>Google Maps</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => handleMapNavigation('waze')}
          >
            <Text style={styles.buttonText}>Waze</Text>
          </TouchableOpacity>
        </View>
      </InfoCard>

      <InfoCard title="Current Location → Venue">
        <Text style={styles.subtitle}>Open in:</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => handleMapNavigation('apple')}
          >
            <Text style={styles.buttonText}>Apple Maps</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => handleMapNavigation('google')}
          >
            <Text style={styles.buttonText}>Google Maps</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => handleMapNavigation('waze')}
          >
            <Text style={styles.buttonText}>Waze</Text>
          </TouchableOpacity>
        </View>
      </InfoCard>

      <InfoCard title="Venue Location">
        <Text style={styles.value}>{address}</Text>
        <Text style={styles.coordinates}>
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </Text>
      </InfoCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  buttonGroup: {
    gap: 8,
  },
  button: {
    backgroundColor: '#008080',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  coordinates: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
});
