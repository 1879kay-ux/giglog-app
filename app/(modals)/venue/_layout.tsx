import { Stack } from 'expo-router';

export default function VenueModalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,     // hides the inherited global header
        presentation: 'modal',  // ensures modal behaviour
      }}
    />
  );
}