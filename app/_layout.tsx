import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#008080' },
        headerTitleStyle: { color: '#fff', fontWeight: '700' },
        headerTintColor: '#fff',
        headerTitleAlign: 'center',
      }}
    >
      {/* Register each screen explicitly */}
      <Stack.Screen name="venue/index" options={{ title: 'Venues' }} />
      <Stack.Screen name="venue/add" options={{ title: 'Add Venue' }} />
      <Stack.Screen name="venue/[id]" options={{ title: 'Venue Details' }} />

      {/* Modals */}
      <Stack.Screen name="(modals)" options={{ headerShown: false }} />
    </Stack>
  );
}