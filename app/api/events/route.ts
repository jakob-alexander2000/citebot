import { after, NextResponse } from "next/server";
import { parseEvent } from "@/lib/analytics";
import { eventSummary, forwardEvent, recordEvent } from "@/lib/event-log";
import { CHIP_ORDER_COOKIE, CHIP_ORDER_MAX_AGE, isChipOrderVariant } from "@/lib/experiment";

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 2000) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Expected JSON." }, { status: 400 });
  }
  const parsed = parseEvent(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  recordEvent(parsed.event);
  after(() => forwardEvent(parsed.event));

  const response = NextResponse.json({ ok: true });
  if (parsed.event.name === "experiment_assignment") {
    const variant = parsed.event.props.variant;
    if (typeof variant === "string" && isChipOrderVariant(variant)) {
      response.cookies.set(CHIP_ORDER_COOKIE, variant, {
        path: "/",
        maxAge: CHIP_ORDER_MAX_AGE,
        sameSite: "lax",
      });
    }
  }
  return response;
}

export async function GET(request: Request) {
  // Touch the request so the tally is not prerendered as an empty static body.
  void request.headers.get("accept");
  return NextResponse.json(eventSummary(), {
    headers: { "Cache-Control": "no-store" },
  });
}
