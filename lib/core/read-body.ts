import { MAX_UPLOAD_BYTES } from "./models";

/** Room for multipart boundaries around a file that is itself at the cap. */
export const UPLOAD_BODY_SLACK = 64 * 1024;

export function declaredBodyTooLarge(request: Request, maxBytes = MAX_UPLOAD_BYTES): boolean {
  const raw = request.headers.get("content-length");
  if (!raw) return false;
  const declared = Number(raw);
  return Number.isFinite(declared) && declared > maxBytes + UPLOAD_BODY_SLACK;
}

/**
 * Read the request body only up to the cap.
 * A Content-Length over the cap cancels the stream before any byte is pulled.
 * A lying or missing length stops at the cap and cancels the rest.
 */
export async function readBodyUpTo(
  request: Request,
  maxBytes = MAX_UPLOAD_BYTES,
): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; reason: "too_large" }> {
  if (declaredBodyTooLarge(request, maxBytes)) {
    await request.body?.cancel().catch(() => undefined);
    return { ok: false, reason: "too_large" };
  }
  const cap = maxBytes + UPLOAD_BODY_SLACK;
  const body = request.body;
  if (!body) return { ok: true, bytes: new Uint8Array() };
  const reader = body.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      if (total + value.byteLength > cap) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, reason: "too_large" };
      }
      total += value.byteLength;
      parts.push(value);
    }
  } catch (err) {
    await reader.cancel().catch(() => undefined);
    throw err;
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return { ok: true, bytes };
}
