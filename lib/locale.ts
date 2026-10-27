export type Locale = "de" | "en";

export const LOCALES = ["de", "en"] as const;

/** Preference cookie. Also mirrored to localStorage by the language switch. */
export const LOCALE_COOKIE = "gd_locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "de" || value === "en";
}

type RankedTag = { tag: string; q: number };

function rankedTags(header: string): RankedTag[] {
  return header
    .split(",")
    .map((part) => {
      const [rawTag, ...params] = part.trim().split(";");
      const tag = rawTag?.trim().toLowerCase() ?? "";
      const qParam = params.find((param) => param.trim().toLowerCase().startsWith("q="));
      const q = qParam ? Number(qParam.trim().slice(2)) : 1;
      return { tag, q: Number.isFinite(q) ? q : 0 };
    })
    .filter((part) => part.tag.length > 0)
    .sort((a, b) => b.q - a.q);
}

/**
 * First German or English tag in quality order.
 * Other languages fall through to English.
 */
export function parseAcceptLanguage(header: string | null | undefined): Locale {
  if (!header?.trim()) return "en";
  for (const part of rankedTags(header)) {
    if (part.tag.startsWith("de")) return "de";
    if (part.tag.startsWith("en")) return "en";
  }
  return "en";
}

/** Cookie wins. Otherwise Accept-Language, then English. */
export function resolveLocale(
  cookie: string | null | undefined,
  acceptLanguage: string | null | undefined,
): Locale {
  if (isLocale(cookie)) return cookie;
  return parseAcceptLanguage(acceptLanguage);
}
