import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("portfolio smoke", () => {
  test("home renders every chapter and starts the particle stage", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: "Suhyeon Yu" }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/dots-ready/);

    for (const name of [
      /rewritten in React/i,
      /for machine unlearning/i,
      /see the same things/i,
      /let’s work together/i,
    ]) {
      const heading = page.getByRole("heading", { level: 2, name });
      await heading.scrollIntoViewIfNeeded();
      await expect(heading).toBeVisible();
    }
  });

  test("experience chapter links to the ABC Fitness case study", async ({
    page,
  }) => {
    await page.goto("/#experience");
    await page.getByRole("link", { name: "ABC Fitness details" }).click();

    await expect(page).toHaveURL(/\/experience\/abc-fitness$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "ABC Fitness" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
    for (const name of [/keep only the latest/i, /ship as one/i]) {
      await expect(
        page.getByRole("heading", { level: 2, name }),
      ).toBeAttached();
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
    await page.goto("/experience/abc-fitness#async");
    const exhaust = page.getByRole("radio", { name: "exhaust" });
    await exhaust.check();
    await expect(exhaust).toBeChecked();
    await expect(
      page.getByText("Busy? New requests are ignored."),
    ).toBeVisible();
  });

  test("contact form submits on Enter and keeps the draft on errors", async ({
    page,
  }) => {
    await page.goto("/#contact");
    const message = page.getByRole("textbox", { name: "Message" });
    await message.fill("Hello!");
    await message.press("Shift+Enter");
    await message.pressSequentially("Second line");
    await expect(message).toHaveValue("Hello!\nSecond line");

    // Passes browser validation but not the server's, so nothing is ever sent.
    await page
      .getByRole("textbox", { name: "Your email" })
      .fill("visitor@localhost");
    await message.press("Enter");

    await expect(page.locator(".contact__status")).toHaveText(
      "Please add an email I can reply to.",
    );
    await expect(message).toHaveValue("Hello!\nSecond line");
  });

  test("header links to the playground", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Playground" }).click();
    await expect(page).toHaveURL(/\/playground$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Playground" }),
    ).toBeVisible();
  });

  test("featured projects open results-first case studies", async ({
    page,
  }) => {
    for (const [section, title] of [
      ["#unlearning-comparator", "Machine Unlearning Comparator"],
      ["#pytorch-cka", "PyTorch-CKA"],
    ]) {
      await page.goto(`/${section}`);
      await page
        .locator(section)
        .getByRole("link", { name: `${title} details` })
        .click();
      await expect(
        page.getByRole("heading", { level: 1, name: title }),
      ).toBeVisible();
      await expect(page.locator(".result")).toHaveCount(4);
    }
  });

  test("/work lists experience and projects and opens a case study", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Work", exact: true }).click();
    await expect(page).toHaveURL(/\/work$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Work" }),
    ).toBeVisible();
    for (const name of ["Experience", "Projects"]) {
      await expect(
        page.getByRole("heading", { level: 2, name, exact: true }),
      ).toBeVisible();
    }
    await expect(page.locator(".work-card")).toHaveCount(4);
    await page.getByRole("link", { name: "PyTorch-CKA" }).click();
    await expect(page).toHaveURL(/\/projects\/pytorch-cka$/);
  });

  for (const path of [
    "/",
    "/work",
    "/experience/abc-fitness",
    "/projects/unlearning-comparator",
    "/projects/pytorch-cka",
    "/playground",
  ]) {
    test(`has no serious accessibility violations on ${path}`, async ({
      page,
    }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }
});
