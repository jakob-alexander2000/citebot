import { cookies, headers } from "next/headers";
import { isBilingual } from "./brand";
import { isLocale, LOCALE_COOKIE, resolveLocale, type Locale } from "./locale";

export type LocaleState = {
  locale: Locale;
  /** `cookie` once the visitor has a stored preference; otherwise the request header. */
  source: "cookie" | "header";
};

export async function getLocaleState(): Promise<LocaleState> {
  if (!isBilingual()) {
    return { locale: "en", source: "header" };
  }
  const jar = await cookies();
  const hdrs = await headers();
  const cookie = jar.get(LOCALE_COOKIE)?.value;
  return {
    locale: resolveLocale(cookie, hdrs.get("accept-language")),
    source: isLocale(cookie) ? "cookie" : "header",
  };
}
