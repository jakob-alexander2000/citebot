import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAcceptLanguage, resolveLocale } from "../lib/locale";

describe("locale", () => {
  it("prefers the higher-quality German or English tag", () => {
    assert.equal(parseAcceptLanguage("de-DE,de;q=0.9,en;q=0.8"), "de");
    assert.equal(parseAcceptLanguage("en-US,en;q=0.9"), "en");
    assert.equal(parseAcceptLanguage("fr-FR,fr;q=0.9,de;q=0.8"), "de");
    assert.equal(parseAcceptLanguage("en;q=0.9,de;q=0.4"), "en");
    assert.equal(parseAcceptLanguage("fr-FR,fr;q=0.9"), "en");
    assert.equal(parseAcceptLanguage(""), "en");
    assert.equal(parseAcceptLanguage(null), "en");
  });

  it("lets a stored preference override Accept-Language", () => {
    assert.equal(resolveLocale("de", "en-US,en;q=0.9"), "de");
    assert.equal(resolveLocale("en", "de-DE,de;q=0.9"), "en");
    assert.equal(resolveLocale("fr", "de-DE"), "de");
    assert.equal(resolveLocale(undefined, "de"), "de");
  });
});
