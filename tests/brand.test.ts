import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { brandSkin, getBrand, isBilingual } from "../lib/brand";
import { activeDemoQuestions } from "../lib/demo-questions";
import { ui } from "../lib/messages";

const KEYS = [
  "NEXT_PUBLIC_BRAND_NAME",
  "NEXT_PUBLIC_BRAND_SKIN",
  "NEXT_PUBLIC_BRAND_ORG",
  "NEXT_PUBLIC_BRAND_TAGLINE",
  "NEXT_PUBLIC_BRAND_TAGLINE_2",
  "NEXT_PUBLIC_BRAND_CORPUS_LABEL",
  "NEXT_PUBLIC_BRAND_ACCENT",
  "NEXT_PUBLIC_BRAND_DESCRIPTION",
  "NEXT_PUBLIC_BRAND_FOOTER",
  "NEXT_PUBLIC_BILINGUAL",
] as const;

const previous = new Map<string, string | undefined>(
  KEYS.map((key) => [key, process.env[key]]),
);

afterEach(() => {
  for (const key of KEYS) {
    const value = previous.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function setEnv(values: Partial<Record<(typeof KEYS)[number], string | undefined>>) {
  for (const key of KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) process.env[key] = value;
  }
}

describe("brand skins", () => {
  it("defaults to the bilingual Grounded Docs product", () => {
    setEnv({});
    assert.equal(brandSkin(), "product");
    assert.equal(isBilingual(), true);
    const brand = getBrand("en");
    assert.equal(brand.name, "Grounded Docs");
    assert.equal(brand.org, "Hartmann Fertigung GmbH");
    assert.equal(brand.bilingual, true);
    assert.match(ui("en").homeLead, /German or English/);
    assert.match(ui("de").homeLead, /Deutsch oder Englisch/);
    assert.match(activeDemoQuestions("en")[0]!.question, /customer-complaint/);
    assert.match(activeDemoQuestions("de")[0]!.question, /Kundenreklamationen/);
  });

  it("treats an explicit Grounded Docs or QM name as the product", () => {
    setEnv({ NEXT_PUBLIC_BRAND_NAME: "Grounded Docs" });
    assert.equal(brandSkin(), "product");
    assert.equal(isBilingual(), true);
    setEnv({ NEXT_PUBLIC_BRAND_NAME: "QM" });
    assert.equal(brandSkin(), "product");
    assert.equal(isBilingual(), true);
  });

  it("keeps CiteBot English-only, with the employee-handbook demo", () => {
    setEnv({ NEXT_PUBLIC_BRAND_NAME: "CiteBot" });
    assert.equal(brandSkin(), "craft");
    assert.equal(isBilingual(), false);
    const brand = getBrand("de");
    assert.equal(brand.name, "CiteBot");
    assert.equal(brand.org, "Nordlicht Labs");
    assert.equal(brand.corpusLabel, "employee handbook");
    assert.equal(brand.accent, "#1d4ed8");
    assert.equal(brand.bilingual, false);
    assert.doesNotMatch(brand.description, /German or English|quality handbook/i);

    const copy = ui("de");
    assert.equal(copy.askHeadline, "What does the handbook say?");
    assert.doesNotMatch(copy.homeLead, /German or English|quality handbook|QM/i);
    assert.doesNotMatch(copy.askLead, /German or English|quality handbook|QM/i);
    assert.equal(copy.metaTitle("CiteBot"), "CiteBot — Employee handbook demo");
    assert.match(activeDemoQuestions("de")[0]!.question, /vacation days/);
    assert.equal(activeDemoQuestions("en").length, 3);
    assert.doesNotMatch(activeDemoQuestions("en")[1]!.question, /inspection records/);
  });

  it("lets a client opt into DE|EN, and lets the product opt out", () => {
    setEnv({
      NEXT_PUBLIC_BRAND_NAME: "Acme Handbook",
      NEXT_PUBLIC_BILINGUAL: "true",
    });
    assert.equal(brandSkin(), "client");
    assert.equal(isBilingual(), true);
    assert.match(ui("de").homeAsk, /Handbuch/);
    assert.match(ui("en").homeLead, /German or English/);

    setEnv({ NEXT_PUBLIC_BRAND_NAME: "Acme Handbook" });
    assert.equal(isBilingual(), false);
    assert.doesNotMatch(ui("en").homeLead, /German or English/);
    assert.doesNotMatch(ui("de").askLead, /QM-Handbuch/);

    setEnv({ NEXT_PUBLIC_BILINGUAL: "false" });
    assert.equal(brandSkin(), "product");
    assert.equal(isBilingual(), false);
    assert.equal(ui("de").placeholder, "Ask the handbook…");
  });

  it("honors an explicit skin override", () => {
    setEnv({
      NEXT_PUBLIC_BRAND_NAME: "Acme Handbook",
      NEXT_PUBLIC_BRAND_SKIN: "craft",
    });
    assert.equal(brandSkin(), "craft");
    assert.equal(isBilingual(), false);
    assert.equal(getBrand("en").org, "Nordlicht Labs");
  });
});
