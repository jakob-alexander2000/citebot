import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getBrand } from "../lib/brand";
import { activeDemoQuestions } from "../lib/demo-questions";
import { ui } from "../lib/messages";

describe("brand", () => {
  it("is CiteBot over the English employee handbook", () => {
    const brand = getBrand("en");
    assert.equal(brand.name, "CiteBot");
    assert.equal(brand.org, "Nordlicht Labs");
    assert.equal(brand.corpusLabel, "employee handbook");
    assert.equal(brand.accent, "#1d4ed8");
    assert.match(brand.description, /employee handbook/i);
    assert.doesNotMatch(brand.description, /quality handbook/i);

    const copy = ui("en");
    assert.equal(copy.askHeadline, "What does the handbook say?");
    assert.match(copy.homeLead, /employee handbook/i);
    assert.doesNotMatch(copy.homeLead, /quality handbook/i);
    assert.equal(copy.metaTitle("CiteBot"), "CiteBot — Handbook answers");
    assert.equal(activeDemoQuestions().length, 3);
    assert.match(activeDemoQuestions()[0]!.question, /vacation days/);
  });
});
