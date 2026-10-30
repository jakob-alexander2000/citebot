import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const BANNED = ["Grounded Docs", "Mittelstand"];

const ROOTS = ["app", "components", "lib", "examples", "docs", "evals", "scripts", "tests"];
const SKIP = new Set(["tests/public-copy.test.ts"]);
const FILES = ["README.md", "FEATURE_MAP.md", "AGENTS.md", "package.json", ".env.example"];

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(md|ts|tsx|json|example)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe("public copy", () => {
  it("does not name the removed product or the market phrase", () => {
    const files = [
      ...FILES.filter((file) => fs.existsSync(path.join(process.cwd(), file))),
      ...ROOTS.flatMap((root) => walk(path.join(process.cwd(), root))),
    ];
    const hits: string[] = [];
    for (const file of files) {
      const relative = path.relative(process.cwd(), file);
      if (SKIP.has(relative)) continue;
      const text = fs.readFileSync(file, "utf8");
      for (const phrase of BANNED) {
        if (text.includes(phrase)) hits.push(`${path.relative(process.cwd(), file)}: ${phrase}`);
      }
    }
    assert.deepEqual(hits, []);
  });
});
