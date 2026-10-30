"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { AnalyticsPage } from "@/lib/analytics";
import { track } from "@/lib/track";

const PATHS: Record<string, AnalyticsPage> = {
  "/": "home",
  "/ask": "ask",
  "/harness": "harness",
  "/handbook": "handbook",
  "/evals": "evals",
};

const SKIN = "citebot";
const lastSent = new Map<string, number>();

function recentlySent(key: string, windowMs: number): boolean {
  const now = Date.now();
  const prev = lastSent.get(key) ?? 0;
  if (now - prev < windowMs) return true;
  lastSent.set(key, now);
  return false;
}

export function Analytics() {
  const pathname = usePathname() || "/";
  const page = PATHS[pathname];

  useEffect(() => {
    if (!page) return;
    if (recentlySent(`page:${page}`, 1200)) return;
    track("page_view", { page, locale: "en", skin: SKIN });
  }, [page]);

  return null;
}
