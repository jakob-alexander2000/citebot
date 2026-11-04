import { UPLOAD_RATE_LIMIT, UPLOAD_RATE_WINDOW_MS } from "./models";

type Bucket = { hits: number[] };

const buckets = new Map<string, Bucket>();
let limit = UPLOAD_RATE_LIMIT;
let windowMs = UPLOAD_RATE_WINDOW_MS;

export function resetRateLimitForTests(): void {
  buckets.clear();
  limit = UPLOAD_RATE_LIMIT;
  windowMs = UPLOAD_RATE_WINDOW_MS;
}

export function setUploadRateForTests(next: { limit: number; windowMs: number }): void {
  limit = next.limit;
  windowMs = next.windowMs;
  buckets.clear();
}

export function uploadRateConfig(): { limit: number; windowMs: number } {
  return { limit, windowMs };
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip")?.trim();
  return real || "unknown";
}

export function consumeUpload(ip: string, now = Date.now()): { ok: true } | { ok: false; retryAfterSec: number } {
  const windowStart = now - windowMs;
  const bucket = buckets.get(ip) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((stamp) => stamp > windowStart);
  if (bucket.hits.length >= limit) {
    buckets.set(ip, bucket);
    const oldest = bucket.hits[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { ok: false, retryAfterSec };
  }
  bucket.hits.push(now);
  buckets.set(ip, bucket);
  return { ok: true };
}
