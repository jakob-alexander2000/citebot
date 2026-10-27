"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { AnalyticsPage } from "@/lib/analytics";
import type { BrandSkin } from "@/lib/brand";
import { LOCALE_COOKIE, type Locale } from "@/lib/locale";
import { track } from "@/lib/track";

const PATHS: Record<string, AnalyticsPage> = {
  "/": "home",
  "/ask": "ask",
  "/harness": "harness",
  "/handbook": "handbook",
  "/growth": "growth",
};

const lastSent = new Map<string, number>();

function recentlySent(key: string, windowMs: number): boolean {
  const now = Date.now();
  const prev = lastSent.get(key) ?? 0;
  if (now - prev < windowMs) return true;
  lastSent.set(key, now);
  return false;
}

function germanPreference(): boolean {
  try {
    if (document.cookie.split("; ").includes(`${LOCALE_COOKIE}=de`)) return true;
  } catch {
    /* Cookie access can throw in a locked-down frame. */
  }
  const tags =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];
  return tags.some((tag) => tag.toLowerCase().startsWith("de"));
}

export function Analytics({ locale, skin }: { locale: Locale; skin: BrandSkin }) {
  const pathname = usePathname() || "/";
  const page = PATHS[pathname];
  const reportedLocale: Locale = skin === "craft" ? "en" : locale;

  useEffect(() => {
    if (!page) return;
    if (recentlySent(`page:${page}:${reportedLocale}:${skin}`, 1200)) return;
    track("page_view", { page, locale: reportedLocale, skin });
  }, [page, reportedLocale, skin]);

  useEffect(() => {
    if (skin !== "craft") return;
    if (!germanPreference()) return;
    try {
      if (sessionStorage.getItem("cb_locale_ignored")) return;
      sessionStorage.setItem("cb_locale_ignored", "1");
    } catch {
      if (recentlySent("locale_ignored", 60_000)) return;
    }
    track("locale_ignored", { requested: "de", skin: "craft" });
  }, [skin]);

  return null;
}
