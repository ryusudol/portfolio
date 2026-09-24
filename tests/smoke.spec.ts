import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("portfolio smoke", () => {
  test("renders every chapter and starts the particle stage", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: "Suhyeon Yu" }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/dots-ready/);

    for (const name of [
      /keep only the latest/i,
      /redesigned beyond scope/i,
      /one class forgotten/i,
      /ship as one/i,
      /made quadratic/i,
      /give your idea a shape/i,
    ]) {
      const heading = page.getByRole("heading", { level: 2, name });
      await heading.scrollIntoViewIfNeeded();
      await expect(heading).toBeVisible();
    }
  });

  test("theme toggle switches and persists", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const initial = await html.getAttribute("data-theme");
    const next = initial === "ink" ? "paper" : "ink";

    await page.getByRole("button", { name: `Switch to ${next} theme` }).click();
    await expect(html).toHaveAttribute("data-theme", next);

    await page.reload();
    await expect(html).toHaveAttribute("data-theme", next);
  });

  test("operator picker explains the selected strategy", async ({ page }) => {
    await page.goto("/#async");
    const exhaust = page.getByRole("radio", { name: "exhaust" });
    await exhaust.check();
    await expect(exhaust).toBeChecked();
    await expect(
      page.getByText("Busy? New requests are ignored."),
    ).toBeVisible();
  });

  test("has no serious accessibility violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
