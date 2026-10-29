/** Language folder tag on a corpus file. The product UI is English. */
export type Locale = "de" | "en";

export const LOCALES = ["de", "en"] as const;

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "de" || value === "en";
}
