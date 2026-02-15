import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity, View } from 'react-native';

export default function BandMembersScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Band Members',
          headerLeft: () => (
            <View style={{ paddingLeft: 12 }}>
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back-outline" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          ),
          headerRight: () => (
            <View style={{ paddingRight: 12 }}>
              <TouchableOpacity onPress={() => router.push('/')}>
                <Ionicons name="home-outline" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <View style={{ flex: 1 }}>
        {/* Band members list will be added here */}
      </View>
    </>
  );
}