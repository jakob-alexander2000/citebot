import type { Locale } from "./locale";

export type LocaleState = {
  locale: Locale;
  source: "header";
};

/** CiteBot is English. Language folders in a corpus are not a visitor switch. */
export async function getLocaleState(): Promise<LocaleState> {
  return { locale: "en", source: "header" };
}
