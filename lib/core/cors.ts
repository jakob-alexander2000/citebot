export function isAllowedOrigin(origin: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  const host = url.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return url.protocol === "http:" || url.protocol === "https:";
  }
  if (url.protocol !== "https:") return false;
  return host === "vercel.app" || host.endsWith(".vercel.app");
}

export function corsHeaders(request: Request): Headers {
  const headers = new Headers();
  headers.set("Vary", "Origin");
  const origin = request.headers.get("origin");
  if (origin && isAllowedOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, x-citebot-session");
    headers.set("Access-Control-Max-Age", "86400");
  }
  return headers;
}

export function jsonResponse(
  request: Request,
  body: unknown,
  status = 200,
  extra?: Headers,
): Response {
  const headers = corsHeaders(request);
  headers.set("Content-Type", "application/json; charset=utf-8");
  extra?.forEach((value, key) => {
    headers.append(key, value);
  });
  return new Response(JSON.stringify(body), { status, headers });
}

export function emptyCors(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
