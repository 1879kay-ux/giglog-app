import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";

type Props = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
};

export default function ActionButton({
  label,
  icon,
  onPress,
  disabled,
  style,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {icon ? (
          <Ionicons name={icon} size={18} color="#fff" style={styles.icon} />
        ) : null}
        <Text style={styles.text}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: "center",
    backgroundColor: colors.button,
    borderColor: colors.primary,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    minHeight: 44,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
});
