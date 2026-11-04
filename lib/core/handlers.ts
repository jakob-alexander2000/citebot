import { z } from "zod";
import { answerQuestion, SessionExpiredError } from "./answer";
import { jsonResponse } from "./cors";
import { indexRawChunks } from "./index-docs";
import { limitsPayload } from "./limits";
import { MAX_UPLOAD_BYTES, QuotaExceededError } from "./models";
import { chunksFromPdf, isPdfBytes, PdfRejected } from "./pdf-inspect";
import { getModelProvider } from "./provider";
import { readBodyUpTo } from "./read-body";
import { clientIp, consumeUpload } from "./rate-limit";
import { endSession, getSession, nowMs, putSession, sessionTtlMs } from "./session-store";

const answerSchema = z.object({
  question: z.string().trim().min(1).max(1000),
  locale: z.enum(["de", "en"]).optional(),
  collection: z.enum(["handbook", "phone"]).optional(),
  sessionId: z.string().trim().min(8).max(80).optional(),
  draft: z.string().max(8000).optional(),
  topK: z.number().int().min(1).max(8).optional(),
});

function fail(request: Request, status: number, code: string, error: string): Response {
  return jsonResponse(request, { error, code }, status);
}

export function sessionIdFrom(request: Request): string {
  const header = request.headers.get("x-citebot-session")?.trim();
  if (header) return header;
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)citebot_session=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

export async function handleLimits(request: Request): Promise<Response> {
  return jsonResponse(request, limitsPayload());
}

export async function handleAnswer(request: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return fail(request, 400, "bad_request", "Send a JSON body.");
  }
  const parsed = answerSchema.safeParse(json);
  if (!parsed.success) {
    return fail(request, 400, "bad_request", "Send a question of 1 to 1000 characters.");
  }
  const sessionHeader = sessionIdFrom(request);
  const sessionId = parsed.data.sessionId || sessionHeader || undefined;
  try {
    const result = await answerQuestion({
      question: parsed.data.question,
      locale: parsed.data.locale,
      collection: parsed.data.collection,
      sessionId,
      draft: parsed.data.draft?.trim() ? parsed.data.draft.trim() : undefined,
      topK: parsed.data.topK,
    });
    return jsonResponse(request, result);
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return fail(request, 429, "quota_exceeded", err.message);
    }
    if (err instanceof SessionExpiredError) {
      return fail(request, err.status, err.code, err.message);
    }
    console.info(JSON.stringify({ citebot_answer_error: true, name: err instanceof Error ? err.name : "Error" }));
    return fail(request, 500, "answer_failed", "The answer could not be produced.");
  }
}

function sessionCookie(id: string, maxAge: number): Headers {
  const headers = new Headers();
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  headers.append(
    "Set-Cookie",
    `citebot_session=${encodeURIComponent(id)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`,
  );
  return headers;
}

export function logUpload(summary: {
  pageCount: number;
  chunkCount: number;
  timings: { readMs: number; parseMs: number; indexMs: number };
}): void {
  console.info(JSON.stringify({ citebot_upload: true, ...summary }));
}

export async function handleUpload(request: Request): Promise<Response> {
  const ip = clientIp(request);
  const slot = consumeUpload(ip, nowMs());
  if (!slot.ok) {
    return fail(request, 429, "rate_limited", "Too many uploads from this address. Try again later.");
  }
  const readStarted = Date.now();
  let bytes: Uint8Array;
  try {
    const bounded = await readBodyUpTo(request);
    if (!bounded.ok) {
      return fail(request, 413, "too_large", "A PDF can be at most 10 MB.");
    }
    const contentType = request.headers.get("content-type") ?? "";
    const form = await new Request(request.url, {
      method: "POST",
      headers: contentType ? { "content-type": contentType } : undefined,
      body: new Blob([Uint8Array.from(bounded.bytes)]),
    }).formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return fail(request, 400, "bad_request", "Send the PDF as the file field.");
    }
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return fail(request, 400, "bad_request", "Send the PDF as multipart form data.");
  }
  const readMs = Date.now() - readStarted;
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return fail(request, 413, "too_large", "A PDF can be at most 10 MB.");
  }
  if (!isPdfBytes(bytes)) {
    return fail(request, 415, "not_pdf", "The file content is not a PDF.");
  }
  try {
    const parsed = await chunksFromPdf(bytes, "upload");
    const indexStarted = Date.now();
    const provider = getModelProvider();
    const chunks = await indexRawChunks(parsed.chunks, provider);
    const indexMs = Date.now() - indexStarted;
    const session = putSession({ pageCount: parsed.pageCount, chunks });
    const timings = { readMs, parseMs: parsed.parseMs, indexMs };
    logUpload({ pageCount: parsed.pageCount, chunkCount: chunks.length, timings });
    return jsonResponse(
      request,
      {
        sessionId: session.id,
        pageCount: parsed.pageCount,
        chunkCount: chunks.length,
        timings,
        provider: provider.id,
        expiresInMinutes: Math.round(sessionTtlMs() / 60000),
      },
      200,
      sessionCookie(session.id, Math.floor(sessionTtlMs() / 1000)),
    );
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return fail(request, 429, "quota_exceeded", err.message);
    }
    if (err instanceof PdfRejected) {
      return fail(request, err.status, err.code, err.message);
    }
    console.info(JSON.stringify({ citebot_upload_error: true, name: err instanceof Error ? err.name : "Error" }));
    return fail(request, 500, "upload_failed", "The PDF could not be indexed.");
  }
}

export async function handleUploadDelete(request: Request): Promise<Response> {
  const id = sessionIdFrom(request);
  if (id) endSession(id);
  return jsonResponse(request, { ended: true }, 200, sessionCookie("", 0));
}

export function hasSession(id: string): boolean {
  return getSession(id) !== null;
}
