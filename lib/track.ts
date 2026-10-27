/** Best-effort same-origin post. Failures stay on the page. */

export function track(name: string, props: Record<string, string | number>): void {
  const body = JSON.stringify({ name, props });
  try {
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    /* The ask loop does not depend on the log. */
  }
}
