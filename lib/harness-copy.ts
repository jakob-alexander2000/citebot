import type { Locale } from "./locale";
import type { ClaimVerdict, VerificationSummary } from "./types";

export type HarnessClaim = {
  claim: string;
  verdict: ClaimVerdict;
  evidence: string;
  sourceTitle?: string;
};

export type HarnessExample = {
  id: string;
  label: string;
  question: string;
  answer: string;
  note: string;
  summary: VerificationSummary;
  claims: HarnessClaim[];
};

export type HarnessCopy = {
  metaDescription: string;
  kicker: string;
  title: string;
  lead: (name: string, org: string) => string;
  problemTitle: string;
  problem: string;
  architectureTitle: string;
  architectureBefore: string;
  architectureAfter: string;
  steps: { step: string; title: string; body: string }[];
  loopTitle: string;
  loop: string;
  tools: { name: string; body: string }[];
  testsNote: string;
  examplesTitle: string;
  examplesLead: string;
  examples: HarnessExample[];
  tryTitle: string;
  tryItems: { label: string; body: string }[];
  openAsk: (name: string) => string;
  source: string;
  footer: string;
};

const TOOLS_EN = [
  { name: "search_handbook", body: "Passages for a query." },
  { name: "list_topics", body: "Document titles and section names." },
  { name: "get_section", body: "One section by id, file, or title." },
  { name: "quote_check", body: "Whether a claimed quote appears in the text." },
];

const TOOLS_DE = [
  { name: "search_handbook", body: "Textstellen zu einer Frage." },
  { name: "list_topics", body: "Dokumenttitel und Abschnittsnamen." },
  { name: "get_section", body: "Ein Abschnitt nach id, Datei oder Titel." },
  { name: "quote_check", body: "Ob ein behauptetes Zitat im Text steht." },
];

export const HARNESS: Record<Locale, HarnessCopy> = {
  en: {
    metaDescription:
      "How Grounded Docs checks answers against the quality-handbook passages it retrieved.",
    kicker: "Verify harness",
    title: "An answer checked against the handbook.",
    lead: (name, org) =>
      `${name} answers from the ${org} quality handbook in the language you selected. After the draft, one verify step scores each claim against the same retrieved passages — pass, fail, or unsupported — and shows the evidence under the citation chips.`,
    problemTitle: "Why the second pass exists",
    problem:
      "Citation chips can look authoritative while the prose quietly drifts. The verify step scores each claim against the retrieved passages and shows that result in the Evidence panel. It is not a confidence slider and not a second corpus.",
    architectureTitle: "Architecture",
    architectureBefore: "One path for every answer:",
    architectureAfter:
      "The draft and the verifier share the passages those tools returned.",
    steps: [
      { step: "1", title: "Plan", body: "Choose a handbook tool — search, a section, topics, or a quote check." },
      { step: "2", title: "Tools", body: "Run at most three corpus-only calls. No web, no shell." },
      { step: "3", title: "Draft", body: "Write a short answer from the passages those tools returned." },
      { step: "4", title: "Verify", body: "Split claims and mark each pass, fail, or unsupported." },
    ],
    loopTitle: "Agent loop",
    loop: "Each question runs a short loop before the draft: a plan, then at most three handbook tools. A fourth tool call, or the same call twice, stops the loop with a clear message. The transcript shows the tool names. The Evidence panel stays the pass / fail surface.",
    tools: TOOLS_EN,
    testsNote:
      "Tools stay inside the active language of the handbook. Fixture tests for the loop and the verifier run without a live API key.",
    examplesTitle: "Evidence examples",
    examplesLead:
      "Three panels from the Hartmann quality handbook. Same chrome as the live Evidence panel.",
    examples: [
      {
        id: "grounded",
        label: "01 · Grounded pass",
        question:
          "What is the customer-complaint target, and over what period is it measured?",
        answer:
          "The customer-complaint target is at most 8 ppm over a rolling 12-month window.",
        note: "The ppm claim lands on the quality-policy sentence: Pass, the quote, and the source title.",
        summary: "grounded",
        claims: [
          {
            claim: "The customer-complaint target is at most 8 ppm.",
            verdict: "pass",
            evidence: "Supported: “at most 8 ppm over a rolling 12-month window”",
            sourceTitle: "Quality policy",
          },
          {
            claim: "The target is measured over a rolling 12-month window.",
            verdict: "pass",
            evidence: "Supported: “over a rolling 12-month window”",
            sourceTitle: "Quality policy",
          },
        ],
      },
      {
        id: "mixed",
        label: "02 · Partial support",
        question:
          "Are printouts controlled documents, and are customer inspection records kept for three years?",
        answer:
          "Printouts are uncontrolled copies and must be checked against the QM portal. Customer-specific inspection records are kept for three years.",
        note: "The printout claim is in document control. The three-year retention is not — the handbook says 10 years — so the summary is mixed.",
        summary: "mixed",
        claims: [
          {
            claim: "Printouts are uncontrolled copies.",
            verdict: "pass",
            evidence: "Supported: “Printouts are uncontrolled copies”",
            sourceTitle: "Document control",
          },
          {
            claim: "Customer-specific inspection records are kept for three years.",
            verdict: "fail",
            evidence:
              "The handbook says customer-specific inspection records are kept for 10 years, not three.",
            sourceTitle: "Document control",
          },
        ],
      },
      {
        id: "gap",
        label: "03 · Gap / refusal",
        question: "What is the quality representative's first name?",
        answer:
          "The quality handbook names the quality representative as a role only, so I can’t give a first name from the documents.",
        note: "A correct gap is a pass on the refusal. An invented first name would be unsupported or fail.",
        summary: "grounded",
        claims: [
          {
            claim: "The handbook does not give the quality representative's first name.",
            verdict: "pass",
            evidence:
              "Retrieved chapters name the role only. The refusal matches that gap.",
          },
        ],
      },
    ],
    tryTitle: "How to try it",
    tryItems: [
      {
        label: "Grounded",
        body: "ask the customer-complaint question — expect pass on 8 ppm and the 12-month window.",
      },
      {
        label: "Mixed",
        body: "ask whether printouts are controlled and whether inspection records are kept for three years — the printout claim should pass; three years should fail.",
      },
      {
        label: "Gap",
        body: "ask for the quality representative’s first name — a refusal should pass. An invented name must not.",
      },
    ],
    openAsk: (name) => `Ask ${name}`,
    source: "Source",
    footer:
      "The same verify step runs on every answer. Fixture tests cover the loop without a live model.",
  },
  de: {
    metaDescription:
      "Wie Grounded Docs Antworten gegen die Textstellen aus dem QM-Handbuch prüft.",
    kicker: "Nachweis",
    title: "Eine Antwort, geprüft am Handbuch.",
    lead: (name, org) =>
      `${name} antwortet aus dem QM-Handbuch der ${org} in der gewählten Sprache. Nach dem Entwurf bewertet ein Prüfschritt jede Aussage gegen dieselben Textstellen — belegt, Widerspruch oder nicht belegt — und zeigt den Nachweis unter den Quellchips.`,
    problemTitle: "Wozu der zweite Schritt da ist",
    problem:
      "Quellchips können sicher wirken, während der Satz daneben abdriftet. Der Prüfschritt bewertet jede Aussage gegen die geholten Textstellen und zeigt das Ergebnis im Nachweis. Das ist kein Vertrauensregler und kein zweites Korpus.",
    architectureTitle: "Aufbau",
    architectureBefore: "Ein Weg für jede Antwort:",
    architectureAfter:
      "Entwurf und Prüfschritt nutzen dieselben Textstellen, die die Werkzeuge geliefert haben.",
    steps: [
      { step: "1", title: "Plan", body: "Ein Handbuch-Werkzeug wählen — Suche, Abschnitt, Themen oder Zitatprüfung." },
      { step: "2", title: "Werkzeuge", body: "Höchstens drei Aufrufe, nur im Korpus. Kein Web, keine Shell." },
      { step: "3", title: "Entwurf", body: "Eine kurze Antwort aus genau diesen Textstellen." },
      { step: "4", title: "Nachweis", body: "Aussagen trennen und jede als belegt, Widerspruch oder nicht belegt markieren." },
    ],
    loopTitle: "Agentenschleife",
    loop: "Jede Frage läuft vor dem Entwurf durch eine kurze Schleife: ein Plan, dann höchstens drei Handbuch-Werkzeuge. Ein vierter Aufruf oder derselbe Aufruf ein zweites Mal stoppt mit einer klaren Meldung. Das Protokoll zeigt die Werkzeugnamen. Der Nachweis bleibt die Fläche für belegt und Widerspruch.",
    tools: TOOLS_DE,
    testsNote:
      "Die Werkzeuge bleiben in der aktiven Sprache des Handbuchs. Fixture-Tests für Schleife und Nachweis laufen ohne Live-API-Schlüssel.",
    examplesTitle: "Beispiele für den Nachweis",
    examplesLead:
      "Drei Felder aus dem QM-Handbuch der Hartmann Fertigung. Dieselbe Oberfläche wie der Nachweis im Chat.",
    examples: [
      {
        id: "grounded",
        label: "01 · Belegt",
        question:
          "Wie hoch ist das Ziel für Kundenreklamationen, und über welchen Zeitraum wird es gemessen?",
        answer:
          "Das Ziel für Kundenreklamationen liegt bei höchstens 8 ppm über ein rollierendes Fenster von 12 Monaten.",
        note: "Die ppm-Aussage sitzt auf dem Satz der Qualitätspolitik: belegt, mit Zitat und Quelltitel.",
        summary: "grounded",
        claims: [
          {
            claim: "Das Ziel für Kundenreklamationen liegt bei höchstens 8 ppm.",
            verdict: "pass",
            evidence: "Belegt: „höchstens 8 ppm über ein rollierendes Fenster von 12 Monaten“",
            sourceTitle: "Qualitätspolitik",
          },
          {
            claim: "Gemessen wird über ein rollierendes Fenster von 12 Monaten.",
            verdict: "pass",
            evidence: "Belegt: „über ein rollierendes Fenster von 12 Monaten“",
            sourceTitle: "Qualitätspolitik",
          },
        ],
      },
      {
        id: "mixed",
        label: "02 · Teilweise belegt",
        question:
          "Gelten Ausdrucke als gelenkte Dokumente, und werden kundenspezifische Prüfprotokolle drei Jahre aufbewahrt?",
        answer:
          "Ausdrucke gelten als unkontrollierte Kopien und sind mit dem QM-Portal abzugleichen. Kundenspezifische Prüfprotokolle werden drei Jahre aufbewahrt.",
        note: "Die Aussage zu Ausdrucken steht in der Dokumentenlenkung. Drei Jahre stehen dort nicht — das Handbuch sagt 10 Jahre. Der Nachweis ist gemischt.",
        summary: "mixed",
        claims: [
          {
            claim: "Ausdrucke gelten als unkontrollierte Kopien.",
            verdict: "pass",
            evidence: "Belegt: „Ausdrucke gelten als unkontrollierte Kopien“",
            sourceTitle: "Dokumentenlenkung",
          },
          {
            claim: "Kundenspezifische Prüfprotokolle werden drei Jahre aufbewahrt.",
            verdict: "fail",
            evidence:
              "Das Handbuch sagt, dass kundenspezifische Prüfprotokolle 10 Jahre aufbewahrt werden, nicht drei.",
            sourceTitle: "Dokumentenlenkung",
          },
        ],
      },
      {
        id: "gap",
        label: "03 · Lücke",
        question: "Wie heißt die QM-Beauftragte mit Vornamen?",
        answer:
          "Das QM-Handbuch nennt die QM-Beauftragte nur als Rolle, deshalb kann ich aus den Dokumenten keinen Vornamen nennen.",
        note: "Eine echte Lücke ist ein belegter Hinweis auf die Lücke. Ein erfundener Vorname wäre nicht belegt oder ein Widerspruch.",
        summary: "grounded",
        claims: [
          {
            claim: "Das Handbuch nennt keinen Vornamen der QM-Beauftragten.",
            verdict: "pass",
            evidence:
              "Die Kapitel nennen nur die Rolle. Die Auskunft entspricht dieser Lücke.",
          },
        ],
      },
    ],
    tryTitle: "So prüfen Sie es",
    tryItems: [
      {
        label: "Belegt",
        body: "fragen Sie nach dem Ziel für Kundenreklamationen — erwarten Sie belegt bei 8 ppm und dem Fenster von 12 Monaten.",
      },
      {
        label: "Gemischt",
        body: "fragen Sie, ob Ausdrucke gelenkt sind und ob Prüfprotokolle drei Jahre aufbewahrt werden — Ausdrucke sollten belegt sein, drei Jahre ein Widerspruch.",
      },
      {
        label: "Lücke",
        body: "fragen Sie nach dem Vornamen der QM-Beauftragten — eine Absage sollte belegt sein. Ein erfundener Name nicht.",
      },
    ],
    openAsk: (name) => `${name} fragen`,
    source: "Quelltext",
    footer:
      "Derselbe Prüfschritt läuft bei jeder Antwort. Fixture-Tests decken die Schleife ohne Live-Modell ab.",
  },
};
