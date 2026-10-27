import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isGeminiModelNotFound,
  isRetryableGeminiError,
  isTransientGeminiError,
} from "../lib/llm";

describe("llm error classification", () => {
  it("detects transient Gemini overload errors", () => {
    const err = new Error(
      "[GoogleGenerativeAI Error]: gemini-1.5-flash:generateContent: [503 Service Unavailable] This model is currently experiencing high demand",
    );
    assert.equal(isTransientGeminiError(err), true);
    assert.equal(isRetryableGeminiError(err), true);
    assert.equal(isGeminiModelNotFound(err), false);
  });

  it("detects model-not-found errors", () => {
    const err = new Error("models/gemini-foo is not found for API version v1beta");
    assert.equal(isGeminiModelNotFound(err), true);
    assert.equal(isRetryableGeminiError(err), true);
    assert.equal(isTransientGeminiError(err), false);
  });

  it("does not treat auth errors as retryable", () => {
    const err = new Error("API key not valid. Please pass a valid API key.");
    assert.equal(isRetryableGeminiError(err), false);
  });
});
