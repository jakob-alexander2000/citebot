import type { Locale } from "./locale";

export type DemoQuestion = {
  question: string;
  /** Fact a grounded answer should surface, for the demo script. */
  expects: string;
  source: string;
};

export const DEMO_QUESTIONS: Record<Locale, readonly DemoQuestion[]> = {
  de: [
    {
      question:
        "Wie hoch ist das Ziel für Kundenreklamationen, und über welchen Zeitraum wird es gemessen?",
      expects: "höchstens 8 ppm über ein rollierendes Fenster von 12 Monaten",
      source: "de/qualitaetspolitik.md",
    },
    {
      question:
        "Wie lange werden kundenspezifische Prüfprotokolle aufbewahrt, und gelten Ausdrucke als gelenkte Dokumente?",
      expects: "10 Jahre; Ausdrucke sind unkontrollierte Kopien",
      source: "de/dokumentenlenkung.md",
    },
    {
      question:
        "Innerhalb welcher Frist braucht eine Klasse-A-Abweichung eine Sofortmaßnahme, und wann erfolgt die Wirksamkeitsprüfung?",
      expects: "Sofortmaßnahme innerhalb von 24 Stunden; Wirksamkeitsprüfung nach 90 Kalendertagen",
      source: "de/capa.md",
    },
  ],
  en: [
    {
      question:
        "What is the customer-complaint target, and over what period is it measured?",
      expects: "at most 8 ppm over a rolling 12-month window",
      source: "en/quality-policy.md",
    },
    {
      question:
        "How long are customer-specific inspection records kept, and are printouts controlled documents?",
      expects: "10 years; printouts are uncontrolled copies",
      source: "en/document-control.md",
    },
    {
      question:
        "How quickly does a class A nonconformity need containment, and when is the effectiveness check due?",
      expects: "containment within 24 hours; effectiveness check 90 calendar days after implementation",
      source: "en/capa.md",
    },
  ],
};

/** Off-corpus check. The handbook names the role and not a person. */
export const GAP_QUESTIONS: Record<Locale, string> = {
  de: "Wie heißt die QM-Beauftragte mit Vornamen?",
  en: "What is the quality representative's first name?",
};
