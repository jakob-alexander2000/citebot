/** Stop a hung ask before the visitor sits on a blank reply. */
export const ASK_TIMEOUT_MS = 45_000;

export const ASK_TIMEOUT_MESSAGE = "This question did not finish in time. Try again.";

export function messageForAskError(err: unknown): string {
  if (isAskTimeout(err)) return ASK_TIMEOUT_MESSAGE;
  if (err instanceof Error && err.message.trim()) return err.message;
  return "Something went wrong. Try again.";
}

export function isAskTimeout(err: unknown): boolean {
  if (!err || typeof err !== "object" || !("name" in err)) return false;
  const name = String(err.name);
  return name === "TimeoutError" || name === "AbortError";
}
