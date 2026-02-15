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
    />
  );
}