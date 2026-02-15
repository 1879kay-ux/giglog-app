import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>

      <View style={styles.menuContainer}>

        <MenuButton
          label="Events"
          icon="calendar"
          onPress={() => router.push({ pathname: '/events' })}

        />

        <MenuButton
          label="Venues"
          icon="map-marker"
          onPress={() => router.push({ pathname: '/venue' })}

        />

        <MenuButton
          label="Band Members"
          icon="users"
         onPress={() => router.push({ pathname: '/band' })}

        />

        <MenuButton
          label="Profile"
          icon="user"
          onPress={() => router.push({ pathname: '/profile' })}

        />

      </View>
    </View>
  );
}

type MenuButtonProps = {
  label: string;
  icon: any;
  onPress: () => void;
};

function MenuButton({ label, icon, onPress }: MenuButtonProps) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <FontAwesome name={icon} size={24} color="#333" style={styles.buttonIcon} />
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 30,
    color: '#111',
  },
  menuContainer: {
    gap: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 10,
    elevation: 1,
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
});