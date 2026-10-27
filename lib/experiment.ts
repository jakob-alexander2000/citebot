/**
 * Chip order on the CiteBot /ask empty state.
 * control keeps handbook order. demo_first leads with the Friday demo page.
 * The cookie sticks for 180 days. Other skins do not assign a variant.
 */
import type { BrandSkin } from "./brand";

export const CHIP_ORDER_EXPERIMENT = "ask_chip_order";
export const CHIP_ORDER_COOKIE = "cb_chip_order";
export const CHIP_ORDER_MAX_AGE = 60 * 60 * 24 * 180;
export const CHIP_ORDER_VARIANTS = ["control", "demo_first"] as const;
export type ChipOrderVariant = (typeof CHIP_ORDER_VARIANTS)[number];

export function isChipOrderVariant(value: string | null | undefined): value is ChipOrderVariant {
  return value === "control" || value === "demo_first";
}

/** `random` is in [0, 1). Values under 0.5 are control. */
export function assignChipOrder(
  cookie: string | null | undefined,
  random: number,
): { variant: ChipOrderVariant; fresh: boolean } {
  if (isChipOrderVariant(cookie)) return { variant: cookie, fresh: false };
  const variant: ChipOrderVariant = random < 0.5 ? "control" : "demo_first";
  return { variant, fresh: true };
}

/** Craft skin only. Product and client deploys keep the handbook order. */
export function chipExperimentForSkin(
  skin: BrandSkin,
  cookie: string | null | undefined,
  random: number,
): { variant: ChipOrderVariant | null; fresh: boolean } {
  if (skin !== "craft") return { variant: null, fresh: false };
  return assignChipOrder(cookie, random);
}

/** Move demo-day.md to the front. Lists without that file stay put. */
export function orderChips<T extends { source: string }>(
  questions: readonly T[],
  variant: ChipOrderVariant | null,
): T[] {
  if (variant !== "demo_first") return [...questions];
  const lead: T[] = [];
  const rest: T[] = [];
  for (const question of questions) {
    const source = question.source.replaceAll("\\", "/");
    if (source === "demo-day.md" || source.endsWith("/demo-day.md")) lead.push(question);
    else rest.push(question);
  }
  if (lead.length === 0) return [...questions];
  return [...lead, ...rest];
}
