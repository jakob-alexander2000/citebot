import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { resetAuditForTests } from "../lib/core/audit";
import { handleAnswer, handleUpload, handleUploadDelete } from "../lib/core/handlers";
import { MAX_UPLOAD_BYTES } from "../lib/core/models";
import { resetRateLimitForTests, setUploadRateForTests } from "../lib/core/rate-limit";
import { getSession, resetSessionsForTests, setClockForTests, setSessionTtlForTests } from "../lib/core/session-store";

const SENTINEL = "ZZ-UPLOAD-SENTINEL-9f3c";

async function makePdf(pages: string[]): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  if (pages.length === 0) doc.addPage();
  for (const text of pages) {
    const page = doc.addPage();
    if (text) page.drawText(text, { x: 50, y: 700, size: 12, font });
  }
  return Buffer.from(await doc.save());
}

function uploadRequest(bytes: Buffer, name: string, ip: string) {
  const form = new FormData();
  form.append("file", new Blob([Uint8Array.from(bytes)]), name);
  const headers = new Headers();
  headers.set("x-forwarded-for", ip);
  headers.set("origin", "https://phone.vercel.app");
  return new Request("http://127.0.0.1/api/upload", { method: "POST", body: form, headers });
}

describe("pdf upload", { concurrency: false }, () => {
  it("rejects a non-PDF by content, including one named like a PDF", async () => {
    resetRateLimitForTests();
    resetSessionsForTests();
    const text = Buffer.from("hello this is plain text");
    const response = await handleUpload(uploadRequest(text, "policy.pdf", "198.51.100.1"));
    const body = (await response.json()) as { code: string };
    assert.equal(response.status, 415);
    assert.equal(body.code, "not_pdf");
    assert.equal(JSON.stringify(body).includes("hello this is plain text"), false);
  });

  it("rejects a file over 10 MB before parsing it", async () => {
    resetRateLimitForTests();
    const bytes = Buffer.alloc(MAX_UPLOAD_BYTES + 1);
    bytes.set(new TextEncoder().encode("%PDF-1.4\n"));
    const response = await handleUpload(uploadRequest(bytes, "big.pdf", "198.51.100.2"));
    const body = (await response.json()) as { code: string };
    assert.equal(response.status, 413);
    assert.equal(body.code, "too_large");
  });

  it("rejects a PDF with more than 50 pages", async () => {
    resetRateLimitForTests();
    const pages = Array.from({ length: 51 }, () => "");
    const bytes = await makePdf(pages);
    const response = await handleUpload(uploadRequest(bytes, "long.pdf", "198.51.100.3"));
    const body = (await response.json()) as { code: string };
    assert.equal(response.status, 422);
    assert.equal(body.code, "too_many_pages");
  });

  it("indexes a PDF in memory, logs only counts, and drops it when the session ends or expires", async () => {
    resetRateLimitForTests();
    resetSessionsForTests();
    resetAuditForTests();
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_API_TOKEN;
    let now = 1_700_000_000_000;
    setClockForTests(() => now);
    setSessionTtlForTests(30 * 60 * 1000);

    const logs: string[] = [];
    const writes: string[] = [];
    const original = {
      info: console.info,
      log: console.log,
      warn: console.warn,
      error: console.error,
      write: fs.writeFileSync,
      append: fs.appendFileSync,
    };
    console.info = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };
    console.warn = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };
    console.error = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };
    fs.writeFileSync = ((file, data, options) => {
      writes.push(typeof data === "string" ? data : Buffer.from(data as Uint8Array).toString("utf8"));
      return original.write(file, data, options);
    }) as typeof fs.writeFileSync;
    fs.appendFileSync = ((file, data, options) => {
      writes.push(typeof data === "string" ? data : Buffer.from(data as Uint8Array).toString("utf8"));
      return original.append(file, data, options);
    }) as typeof fs.appendFileSync;

    try {
      const bytes = await makePdf([`On site visit costs 90 EUR. ${SENTINEL}`]);
      const response = await handleUpload(uploadRequest(bytes, "notes.txt", "198.51.100.4"));
      const body = (await response.json()) as {
        sessionId: string;
        pageCount: number;
        chunkCount: number;
        provider: string;
        timings: { readMs: number; parseMs: number; indexMs: number };
      };
      assert.equal(response.status, 200);
      assert.equal(body.provider, "mock");
      assert.equal(body.pageCount, 1);
      assert.ok(body.chunkCount >= 1);
      assert.equal(JSON.stringify(body).includes(SENTINEL), false);
      assert.match(response.headers.get("set-cookie") ?? "", /HttpOnly/);
      const session = getSession(body.sessionId);
      assert.ok(session);
      assert.ok(session?.chunks.some((chunk) => chunk.text.includes(SENTINEL)));
      const logged = logs.join("\n");
      assert.equal(logged.includes(SENTINEL), false);
      assert.match(logged, /citebot_upload/);
      assert.match(logged, /pageCount/);
      assert.equal(writes.some((blob) => blob.includes(SENTINEL)), false);

      const answer = await handleAnswer(
        new Request("http://127.0.0.1/api/answer", {
          method: "POST",
          headers: { "content-type": "application/json", "x-citebot-session": body.sessionId },
          body: JSON.stringify({ question: "What does the visit cost?", sessionId: body.sessionId }),
        }),
      );
      assert.equal(answer.status, 200);
      const answerBody = (await answer.json()) as { sentences: { text: string }[] };
      assert.equal(JSON.stringify(answerBody).includes(SENTINEL) || answerBody.sentences.length > 0, true);

      const ended = await handleUploadDelete(
        new Request("http://127.0.0.1/api/upload", {
          method: "DELETE",
          headers: { "x-citebot-session": body.sessionId },
        }),
      );
      assert.equal(ended.status, 200);
      assert.equal(getSession(body.sessionId), null);

      const again = await makePdf([`Second visit. ${SENTINEL}`]);
      const second = await handleUpload(uploadRequest(again, "second.pdf", "198.51.100.4"));
      const secondBody = (await second.json()) as { sessionId: string };
      assert.equal(second.status, 200);
      now += 30 * 60 * 1000 + 1;
      assert.equal(getSession(secondBody.sessionId), null);
      const expired = await handleAnswer(
        new Request("http://127.0.0.1/api/answer", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question: "What does the visit cost?", sessionId: secondBody.sessionId }),
        }),
      );
      const expiredBody = (await expired.json()) as { code: string };
      assert.equal(expired.status, 404);
      assert.equal(expiredBody.code, "session_expired");
      assert.equal(JSON.stringify(expiredBody).includes(SENTINEL), false);
    } finally {
      console.info = original.info;
      console.log = original.log;
      console.warn = original.warn;
      console.error = original.error;
      fs.writeFileSync = original.write;
      fs.appendFileSync = original.append;
      resetSessionsForTests();
      resetRateLimitForTests();
    }
  });

  it("rate-limits uploads by IP", async () => {
    resetSessionsForTests();
    setUploadRateForTests({ limit: 2, windowMs: 60_000 });
    const bytes = Buffer.from("not a pdf");
    const first = await handleUpload(uploadRequest(bytes, "a.pdf", "198.51.100.9"));
    const second = await handleUpload(uploadRequest(bytes, "b.pdf", "198.51.100.9"));
    const third = await handleUpload(uploadRequest(bytes, "c.pdf", "198.51.100.9"));
    assert.equal(first.status, 415);
    assert.equal(second.status, 415);
    const body = (await third.json()) as { code: string };
    assert.equal(third.status, 429);
    assert.equal(body.code, "rate_limited");
    resetRateLimitForTests();
  });

  it("returns quota_exceeded from upload and does not keep the session", async () => {
    resetRateLimitForTests();
    resetSessionsForTests();
    process.env.CLOUDFLARE_ACCOUNT_ID = "acct";
    process.env.CLOUDFLARE_API_TOKEN = "tok-secret";
    const original = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ success: false, errors: [{ message: "neuron quota" }] }), { status: 429 });
    const logs: string[] = [];
    const originalInfo = console.info;
    console.info = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };
    try {
      const bytes = await makePdf([`Quota doc ${SENTINEL}`]);
      const response = await handleUpload(uploadRequest(bytes, "quota.pdf", "198.51.100.15"));
      const body = (await response.json()) as { code?: string; sessionId?: string };
      assert.equal(response.status, 429);
      assert.equal(body.code, "quota_exceeded");
      assert.equal(body.sessionId, undefined);
      assert.equal(JSON.stringify(body).includes(SENTINEL), false);
      assert.equal(JSON.stringify(body).includes("tok-secret"), false);
      assert.equal(logs.join("\n").includes(SENTINEL), false);
    } finally {
      globalThis.fetch = original;
      console.info = originalInfo;
      delete process.env.CLOUDFLARE_ACCOUNT_ID;
      delete process.env.CLOUDFLARE_API_TOKEN;
      resetSessionsForTests();
      resetRateLimitForTests();
    }
  });
});
