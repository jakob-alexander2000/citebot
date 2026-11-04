import { expect, test } from "@playwright/test";

test("home and ask demo still render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Ask the handbook.")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.goto("/ask");
  await expect(page.getByPlaceholder("Ask about time off, expenses, desk days…").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("answer page states limits and cites the handbook", async ({ page }) => {
  await page.goto("/answer");
  await expect(page.getByTestId("limits")).toContainText("Provider: mock");
  await expect(page.getByTestId("limits")).toContainText("10 MB");
  await expect(page.getByTestId("limits")).toContainText("50 pages");
  await expect(page.getByTestId("limits")).toContainText("30 minutes");
  await expectNoHorizontalOverflow(page);

  await page.getByTestId("question").fill("How many paid vacation days do full-time employees get?");
  await page.getByTestId("ask-submit").click();
  const result = page.getByTestId("answer-result");
  await expect(result).toContainText("30");
  await expect(result).toContainText("pto-and-leave.md");
  await expect(result).toContainText("unless");
  await expectNoHorizontalOverflow(page);
});

test("a draft that drops unless is flagged", async ({ page }) => {
  await page.goto("/answer");
  await page.getByTestId("question").fill("Until when can unused paid time off carry over?");
  await page
    .getByTestId("draft")
    .fill("Unused paid time off does not carry over past March 31 of the following year.");
  await page.getByTestId("ask-submit").click();
  await expect(page.getByTestId("answer-result")).toContainText("Dropped unless");
  await expectNoHorizontalOverflow(page);
});

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
}
