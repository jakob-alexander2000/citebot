# Demo questions

Six questions for a screenshot of Grounded Docs. Each one should return citation chips and an Evidence panel in the active language. Switch **DE | EN** in the header first; the preference is stored in the `gd_locale` cookie and in `localStorage`.

The sample company is **Hartmann Fertigung GmbH** (Bielefeld, precision turned and milled parts). The handbook is fictional.

## Deutsch

Ask these on `/ask` with the toggle set to **DE**.

1. **Wie hoch ist das Ziel für Kundenreklamationen, und über welchen Zeitraum wird es gemessen?**
   - Expect: höchstens **8 ppm**, rollierendes Fenster von **12 Monaten**.
   - Source: `corpus/de/qualitaetspolitik.md`
   - Evidence: pass on both figures.

2. **Wie lange werden kundenspezifische Prüfprotokolle aufbewahrt, und gelten Ausdrucke als gelenkte Dokumente?**
   - Expect: **10 Jahre**; Ausdrucke sind **unkontrollierte Kopien**.
   - Source: `corpus/de/dokumentenlenkung.md`
   - Evidence: pass. Expand the chip and you should see the retention sentence.

3. **Innerhalb welcher Frist braucht eine Klasse-A-Abweichung eine Sofortmaßnahme, und wann erfolgt die Wirksamkeitsprüfung?**
   - Expect: Sofortmaßnahme innerhalb von **24 Stunden**; Wirksamkeitsprüfung **90 Kalendertage** nach der Umsetzung.
   - Source: `corpus/de/capa.md`
   - Evidence: pass on the deadline and the effectiveness check.

## English

Ask these on `/ask` with the toggle set to **EN**.

1. **What is the customer-complaint target, and over what period is it measured?**
   - Expect: at most **8 ppm** over a rolling **12-month** window.
   - Source: `corpus/en/quality-policy.md`
   - Evidence: pass on both figures.

2. **How long are customer-specific inspection records kept, and are printouts controlled documents?**
   - Expect: **10 years**; printouts are **uncontrolled copies**.
   - Source: `corpus/en/document-control.md`
   - Evidence: pass. The citation chip should open the retention passage.

3. **How quickly does a class A nonconformity need containment, and when is the effectiveness check due?**
   - Expect: containment within **24 hours**; effectiveness check **90 calendar days** after implementation.
   - Source: `corpus/en/capa.md`
   - Evidence: pass on both deadlines.

## Optional gap check

Not one of the six. Use it when you want a refusal in the Evidence panel.

- DE: **Wie heißt die QM-Beauftragte mit Vornamen?**
- EN: **What is the quality representative's first name?**

The handbook names the role only. A refusal should pass. An invented name should not.
