import i18n from "@/lib/i18n";

export function capabilityDisplayName(
  name: string,
  standardKey: string | null | undefined,
): string {
  const key = standardKey?.trim();
  if (!key) return name;

  const translationKey = `capabilities.${key}`;
  const translated = i18n.getResource(
    i18n.resolvedLanguage ?? i18n.language,
    "translation",
    translationKey,
  );

  return typeof translated === "string" ? translated : name;
}
