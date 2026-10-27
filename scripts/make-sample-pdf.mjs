/**
 * One-off: write corpus/remote-work-policy.pdf for PDF ingest smoke tests.
 * Run: node scripts/make-sample-pdf.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "..", "examples", "nordlicht-corpus", "remote-work-policy.pdf");

const lines = [
  "Nordlicht Labs — Remote Work Policy",
  "",
  "Eligibility",
  "Full-time employees may work remotely up to three days per week after their",
  "probation period ends. Managers approve the remote schedule in writing.",
  "",
  "Core hours",
  "Remote days still require presence during core hours 10:00–16:00 Europe/Berlin",
  "for standups and customer calls unless a manager grants an exception.",
  "",
  "Equipment",
  "Nordlicht provides a laptop and a €300 one-time home-office stipend. Chairs",
  "and standing desks above that amount follow the expense policy and need prior",
  "approval. Company devices must use disk encryption and a screen lock.",
  "",
  "Security",
  "Do not process customer data on personal devices. Use the company VPN when",
  "accessing staging systems from outside the office network.",
  "",
  "Travel days",
  "Working from another EU country for up to 20 business days per year is allowed",
  "with two weeks notice to People Ops. Longer stays need a temporary remote",
  "agreement.",
];

const doc = await PDFDocument.create();
const page = doc.addPage([612, 792]);
const font = await doc.embedFont(StandardFonts.Helvetica);
const bold = await doc.embedFont(StandardFonts.HelveticaBold);
let y = 740;
for (const line of lines) {
  if (!line) {
    y -= 14;
    continue;
  }
  const isTitle = line.startsWith("Nordlicht");
  const isHeading =
    !isTitle &&
    line.length < 40 &&
    !line.includes(" ") === false &&
    /^[A-Z]/.test(line) &&
    !line.endsWith(".") &&
    line.split(" ").length <= 3;
  const f = isTitle || isHeading ? bold : font;
  const size = isTitle ? 16 : isHeading ? 12 : 11;
  page.drawText(line, {
    x: 56,
    y,
    size,
    font: f,
    color: rgb(0.1, 0.1, 0.12),
    maxWidth: 500,
  });
  y -= isTitle ? 28 : isHeading ? 22 : 16;
}
const bytes = await doc.save();
fs.writeFileSync(out, bytes);
console.log(`Wrote ${out} (${bytes.length} bytes)`);
