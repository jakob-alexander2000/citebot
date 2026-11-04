import { z } from "zod";
import { summarizeClaims } from "../verify";
import type { AgentStep, ChatResponse, Citation, EvidenceClaim } from "../types";
import { answerQuestion } from "./answer";
import { jsonResponse } from "./cors";
import { QuotaExceededError } from "./models";

const bodySchema = z.object({
  question: z.string().trim().min(1).max(1000),
  locale: z.enum(["de", "en"]).optional(),
});

export function chatResponseFromCore(result: Awaited<ReturnType<typeof answerQuestion>>): ChatResponse {
  const citations = new Map<string, Citation>();
  const claims: EvidenceClaim[] = result.sentences.map((sentence) => {
    for (const passage of sentence.passages) {
      if (!citations.has(passage.id)) {
        citations.set(passage.id, {
          id: passage.id,
          source: passage.source,
          title: passage.title,
          snippet: passage.text.replace(/\s+/g, " ").trim().slice(0, 280),
          score: passage.score,
        });
      }
    }
    const flagged = sentence.flaggedConditions.length > 0;
    return {
      claim: sentence.text,
      verdict: flagged ? "fail" : sentence.match === "supported" ? "pass" : "unsupported",
      evidence: flagged
        ? `Dropped ${sentence.flaggedConditions.map((flag) => flag.phrase).join("; ")}`
        : sentence.passages[0]?.text.replace(/\s+/g, " ").trim().slice(0, 180) ||
          "No passage matched this sentence.",
      citationId: sentence.passages[0]?.id,
    };
  });
  const steps: AgentStep[] = result.trace.map((step) => ({
    kind: step.step === "draft" ? "draft" : "tool",
    tool: step.step === "draft" ? undefined : step.step,
    label: step.step,
    detail: step.detail,
  }));
  return {
    answer: result.sentences.map((sentence) => sentence.text).join(" "),
    citations: [...citations.values()],
    verification: { summary: summarizeClaims(claims), claims },
    steps,
    stoppedEarly: false,
  };
}

/** Handbook chat. Same model provider as POST /api/answer. */
export async function handleChat(request: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonResponse(request, { error: "Send a JSON body.", code: "bad_request" }, 400);
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonResponse(
      request,
      { error: "Send a non-empty question (max 1000 chars).", code: "bad_request" },
      400,
    );
  }
  try {
    const result = await answerQuestion({
      question: parsed.data.question,
      locale: parsed.data.locale ?? "en",
      collection: "handbook",
    });
    return jsonResponse(request, {
      ...chatResponseFromCore(result),
      provider: result.provider,
      requestId: result.requestId,
    });
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return jsonResponse(request, { error: err.message, code: "quota_exceeded" }, 429);
    }
    console.info(JSON.stringify({ citebot_chat_error: true, name: err instanceof Error ? err.name : "Error" }));
    return jsonResponse(
      request,
      { error: "The answer could not be produced.", code: "answer_failed" },
      500,
    );
  }
}
