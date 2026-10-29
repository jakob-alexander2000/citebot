import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isLocale } from "../lib/locale";

describe("locale tags", () => {
  it("recognizes language folders and nothing else", () => {
    assert.equal(isLocale("en"), true);
    assert.equal(isLocale("de"), true);
    assert.equal(isLocale("fr"), false);
    assert.equal(isLocale(""), false);
    assert.equal(isLocale(null), false);
    assert.equal(isLocale(undefined), false);
  });
});
