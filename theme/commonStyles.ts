// theme/commonStyles.ts
import { StyleSheet } from "react-native";
import { colors } from "./colors";

export const commonStyles = StyleSheet.create({
  gigCard: {
    backgroundColor: colors.cardBg,
    padding: 16,
    borderRadius: 10,

    borderLeftWidth: 3,
    borderLeftColor: colors.accent,

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  pillBase: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
  },

  pillDanger: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderRadius: 999,
  },

  pillDangerCount: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderRadius: 10, // matches your “count pill”
  },

  pillDangerText: {
    color: colors.danger,
    fontWeight: "700",
  },

  inputBase: {
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary, // replaces colors.primary drift
  },

  mutedText: {
    color: colors.textMuted,
  },
});