import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  MIN_TEXT_CONTRAST,
  PAGE_DARK,
  PAGE_LIGHT,
  ZINC,
  contrastRatio,
} from "../lib/contrast";

const ROOTS = ["app", "components"];

type Pair = {
  file: string;
  lightFg: string;
  darkFg: string;
  lightBg: string;
  darkBg: string;
  label: string;
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

function classStrings(source: string): string[] {
  const found: string[] = [];
  const re = /className=(?:"([^"]+)"|\{`([^`]+)`\}|`([^`]+)`)/g;
  for (const match of source.matchAll(re)) {
    const value = match[1] ?? match[2] ?? match[3];
    if (value) found.push(value);
  }
  return found;
}

function zincOf(token: string, pattern: RegExp): string | null {
  const match = token.match(pattern);
  return match ? (ZINC[match[1]!] ?? null) : null;
}

/** Resting text colors against the surface that class string paints. */
function pairsFor(file: string, cls: string): Pair[] {
  const tokens = cls.split(/\s+/).filter((token) => !token.startsWith("hover:") && !token.startsWith("dark:hover:"));
  const lightToken = tokens.find((token) => /^text-zinc-\d+$/.test(token) || /^placeholder:text-zinc-\d+$/.test(token) || /^marker:text-zinc-\d+$/.test(token));
  const darkToken = tokens.find((token) => /^dark:(?:placeholder:|marker:)?text-zinc-\d+$/.test(token));
  const white = tokens.includes("text-white");
  if (!lightToken && !darkToken && !white) return [];

  const inverse = tokens.includes("contrast-inverse") || tokens.includes("bg-zinc-900");
  const accent = white && !inverse;
  const lightBg = inverse ? ZINC["900"]! : accent ? "#1d4ed8" : PAGE_LIGHT;
  const darkBg = inverse ? ZINC["100"]! : accent ? "#1d4ed8" : PAGE_DARK;

  const lightFg = lightToken
    ? zincOf(lightToken, /text-zinc-(\d+)/)
    : white
      ? "#ffffff"
      : ZINC["900"]!;
  let darkFg = darkToken
    ? zincOf(darkToken, /text-zinc-(\d+)/)
    : lightToken
      ? lightFg
      : white
        ? "#ffffff"
        : ZINC["100"]!;

  if (!lightFg || !darkFg) return [];
  if (inverse && white && !darkToken) darkFg = ZINC["900"]!;

  return [
    {
      file,
      lightFg,
      darkFg,
      lightBg,
      darkBg,
      label: cls.slice(0, 140),
    },
  ];
}

describe("text contrast", () => {
  it("records the home-page gray that measured under 4.5", () => {
    const before = contrastRatio(ZINC["400"]!, PAGE_LIGHT);
    assert.ok(before < MIN_TEXT_CONTRAST);
    assert.ok(before > 2.3 && before < 2.5);
  });

  it("keeps every resting text color at least 4.5 to 1", () => {
    const failures: string[] = [];
    for (const root of ROOTS) {
      for (const file of walk(path.join(process.cwd(), root))) {
        const source = fs.readFileSync(file, "utf8");
        for (const cls of classStrings(source)) {
          for (const pair of pairsFor(path.relative(process.cwd(), file), cls)) {
            const light = contrastRatio(pair.lightFg, pair.lightBg);
            const dark = contrastRatio(pair.darkFg, pair.darkBg);
            if (light < MIN_TEXT_CONTRAST || dark < MIN_TEXT_CONTRAST) {
              failures.push(
                `${pair.file}: ${light.toFixed(2)} light / ${dark.toFixed(2)} dark — ${pair.label}`,
              );
            }
          }
        }
      }
    }
    assert.deepEqual(failures, []);
  });
});
