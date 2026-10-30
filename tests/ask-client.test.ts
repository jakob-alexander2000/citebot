import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ASK_TIMEOUT_MESSAGE, ASK_TIMEOUT_MS, messageForAskError } from "../lib/ask-client";

describe("ask timeout", () => {
  it("turns a hung request into a retry message", () => {
    assert.ok(ASK_TIMEOUT_MS < 90_000);
    assert.equal(messageForAskError({ name: "TimeoutError" }), ASK_TIMEOUT_MESSAGE);
    assert.equal(messageForAskError({ name: "AbortError" }), ASK_TIMEOUT_MESSAGE);
    assert.match(ASK_TIMEOUT_MESSAGE, /Try again/);
    assert.equal(messageForAskError(new Error("Server is missing GEMINI_API_KEY.")), "Server is missing GEMINI_API_KEY.");
  });
});
