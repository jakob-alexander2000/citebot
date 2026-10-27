"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isLocale, LOCALE_COOKIE, type Locale } from "@/lib/locale";
import { ui } from "@/lib/messages";

function writeCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function fromNavigator(): Locale | null {
  const tags =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    if (lower.startsWith("de")) return "de";
    if (lower.startsWith("en")) return "en";
  }
  return null;
}

export function LocaleSwitch({
  locale,
  source,
}: {
  locale: Locale;
  source: "cookie" | "header";
}) {
  const router = useRouter();
  const copy = ui(locale);
  const [pending, setPending] = useState<Locale | null>(null);
  const active = pending ?? locale;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCALE_COOKIE);
      if (source === "cookie") {
        if (stored !== locale) localStorage.setItem(LOCALE_COOKIE, locale);
        return;
      }
      if (isLocale(stored) && stored !== locale) {
        writeCookie(stored);
        router.refresh();
        return;
      }
      if (!isLocale(stored)) {
        const nav = fromNavigator();
        if (nav && nav !== locale) {
          writeCookie(nav);
          localStorage.setItem(LOCALE_COOKIE, nav);
          router.refresh();
        }
      }
    } catch {
      /* Storage can be blocked; the cookie path still works. */
    }
  }, [locale, source, router]);

  function choose(next: Locale) {
    if (next === active) return;
    setPending(next);
    writeCookie(next);
    try {
      localStorage.setItem(LOCALE_COOKIE, next);
    } catch {
      /* Cookie is the source of truth for the next request. */
    }
    router.refresh();
  }

  return (
    <div
      role="group"
      aria-label={copy.language}
      className="inline-flex rounded-md border border-zinc-200 p-0.5 dark:border-zinc-700"
    >
      {(["de", "en"] as const).map((code) => {
        const selected = active === code;
        return (
          <button
            key={code}
            type="button"
            aria-pressed={selected}
            aria-label={code === "de" ? copy.languageDe : copy.languageEn}
            onClick={() => choose(code)}
            className={
              selected
                ? "rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase text-white"
                : "rounded px-1.5 py-0.5 text-[11px] font-medium uppercase text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100"
            }
            style={selected ? { backgroundColor: "var(--brand-accent)" } : undefined}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
