import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { listHandbookDocs } from "../lib/docs";
import { InlineMarkdown, Markdown } from "../components/Markdown";

describe("answer markdown", () => {
  it("renders bold, italics, and lists without leaving the markers", () => {
    const html = renderToStaticMarkup(
      createElement(Markdown, {
        content: "Full-time employees receive **30 days** of *paid* vacation.\n\n- Desk days\n- Receipts",
      }),
    );
    assert.match(html, /<strong[^>]*>30 days<\/strong>/);
    assert.match(html, /<em[^>]*>paid<\/em>/);
    assert.match(html, /<li[^>]*>[\s\S]*Desk days/);
    assert.doesNotMatch(html, /\*\*30 days\*\*/);
    assert.doesNotMatch(html, /\*paid\*/);
  });

  it("renders the same bold inline where a short answer or source line is shown", () => {
    const html = renderToStaticMarkup(
      createElement(InlineMarkdown, {
        content: "Full-time employees receive **30 days** of paid vacation.",
      }),
    );
    assert.match(html, /<strong[^>]*>30 days<\/strong>/);
    assert.doesNotMatch(html, /\*\*/);
  });

  it("does not treat raw html as markup", () => {
    const html = renderToStaticMarkup(
      createElement(Markdown, { content: "<script>alert(1)</script> and **30 days**" }),
    );
    assert.equal(html.includes("<script>"), false);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(html, /<strong[^>]*>30 days<\/strong>/);
  });

  it("strips bold markers from the time-off summary", async () => {
    const docs = await listHandbookDocs();
    const timeOff = docs.find((doc) => doc.filename.endsWith("pto-and-leave.md"));
    assert.ok(timeOff);
    assert.equal(timeOff.summary.includes("**"), false);
  });
});
