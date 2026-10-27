export type WalkthroughStep = {
  title: string;
  body: string;
};

export type WalkthroughScript = {
  id: "en" | "de";
  kicker: string;
  title: string;
  lead: string;
  steps: readonly WalkthroughStep[];
};

/**
 * Dual-language script for the onboard path.
 * The CiteBot chrome stays English. This is the script, not a locale switch.
 */
export const WALKTHROUGH: readonly WalkthroughScript[] = [
  {
    id: "en",
    kicker: "English",
    title: "Run it in English",
    lead: "The page stays in English. These steps use the sample English pages, then a German question those pages do not answer.",
    steps: [
      {
        title: "Set the packet",
        body: "Open Onboard. Leave the English pages on and the German pages off. Leave the system prompt as it is, or narrow the tools if you want that visible in the ticket.",
      },
      {
        title: "Ask a covered question",
        body: "Ask how many paid vacation days full-time employees get, and when unused PTO expires. Expect 30 days, and expiry on March 31. The guardrail should pass.",
      },
      {
        title: "Ask outside the packet",
        body: "With the German pages still off, ask how long controlled records are kept: „Wie lange werden lenkungsrelevante Aufzeichnungen aufbewahrt?“ Expect a refusal. If the answer invents a retention period, the guardrail says not to hand it off.",
      },
      {
        title: "Turn the German pages on",
        body: "Load the German-pages preset so only those pages are enabled. Ask the same retention question. Expect at least five years, and a passed check.",
      },
      {
        title: "Export the ticket",
        body: "Download JSON or Markdown. The file lists the client label, the system prompt, the tools that were on, the sources used, each tool call, the verify result, and the time.",
      },
    ],
  },
  {
    id: "de",
    kicker: "Deutsch",
    title: "Ablauf für einen deutschsprachigen Kunden",
    lead: "Die Oberfläche bleibt Englisch. Diesen Text können Sie neben der Seite vorlesen. Die deutschen Seiten sind ein kurzes Paket, kein Sprachumschalter.",
    steps: [
      {
        title: "Paket setzen",
        body: "Onboard öffnen. Die englischen Seiten anlassen, die deutschen aus. Die Systemanweisung kann stehen bleiben.",
      },
      {
        title: "Eine gedeckte Frage",
        body: "Auf Englisch fragen, wie viele Urlaubstage Vollzeitkräfte haben und wann Resturlaub verfällt. Erwartung: 30 Tage, Verfall am 31. März. Der Nachweis sollte bestehen.",
      },
      {
        title: "Eine Frage außerhalb des Pakets",
        body: "Deutsche Seiten bleiben aus. Fragen: „Wie lange werden lenkungsrelevante Aufzeichnungen aufbewahrt?“ Erwartung: Absage. Eine erfundene Frist darf der Nachweis nicht durchlassen.",
      },
      {
        title: "Deutsche Seiten einschalten",
        body: "Das Preset mit nur den deutschen Seiten laden. Dieselbe Frage stellen. Erwartung: mindestens fünf Jahre, Nachweis bestanden.",
      },
      {
        title: "Ticket exportieren",
        body: "JSON oder Markdown herunterladen. Darin stehen Quellen, aufgerufene Werkzeuge, das Ergebnis des Nachweises und der Zeitstempel.",
      },
    ],
  },
];
