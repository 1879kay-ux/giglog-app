import { StyleSheet, TextInput, View } from "react-native";

export default function VenueSearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (text: string) => void;
}) {
  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Search venues..."
        value={value}
        onChangeText={onChange}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#f2f2f2",
    padding: 12,
    borderRadius: 8,
  },
});
