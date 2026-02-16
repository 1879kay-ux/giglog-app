import { Stack } from 'expo-router';

export default function VenueModalLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: 'modal',
        headerShown: false,
      }}
    />
  );
}