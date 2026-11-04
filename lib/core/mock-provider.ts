import { deterministicContext, extractiveDraft, gapSentence } from "./draft";
import type { GenerateRequest, GenerateResult, ModelProvider } from "./provider";

/** Deterministic stand-in. No network. Used in tests and when Workers AI is unset. */
export class MockModelProvider implements ModelProvider {
  readonly id = "mock" as const;

  async generate(request: GenerateRequest): Promise<GenerateResult> {
    if (request.purpose === "context") {
      return {
        text: deterministicContext({
          title: request.title?.trim() || "Document",
          headingPath: request.headingPath ?? [],
          locale: request.locale,
        }),
        model: null,
        via: "mock",
      };
    }
    const passages = request.passages ?? [];
    const text =
      passages.length === 0
        ? gapSentence(request.locale)
        : extractiveDraft(request.question ?? "", passages, request.locale);
    return { text, model: null, via: "mock" };
  }
}
