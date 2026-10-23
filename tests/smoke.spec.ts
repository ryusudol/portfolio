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
      /live in the browser/i,
      /for machine unlearning/i,
      /see the same things/i,
      /let’s work together/i,
    ]) {
      const heading = page.getByRole("heading", { level: 2, name });
      await heading.scrollIntoViewIfNeeded();
      await expect(heading).toBeVisible();
    }
  });

  test("/work links to the ABC Fitness case study", async ({ page }) => {
    await page.goto("/work");
    await page.getByRole("link", { name: "ABC Fitness" }).click();

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

  test("before and after screenshots expand together", async ({ page }) => {
    await page.goto("/experience/abc-fitness#redesign");
    const shots = page.locator(".compare__frame img");
    await expect(shots).toHaveCount(2);
    const toggle = page.getByRole("button", { name: "Show both full pages" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    const cropped = await page.locator(".compare__frame").first().boundingBox();
    await toggle.click();
    await expect(
      page.getByRole("button", { name: "Show the first screen" }),
    ).toHaveAttribute("aria-expanded", "true");
    const full = await page.locator(".compare__frame").first().boundingBox();
    expect(full?.height ?? 0).toBeGreaterThan((cropped?.height ?? 0) + 100);
  });

  test("certifications reorder from the keyboard", async ({ page }) => {
    await page.goto("/experience/abc-fitness#interface");
    const rows = page.locator(".certs__row b");
    await expect(rows.first()).toHaveText("Certified Personal Trainer");
    const handle = page.getByRole("button", {
      name: /^Reorder Certified Personal Trainer/,
    });
    await handle.focus();
    await page.keyboard.press("Space");
    await expect(handle).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Space");
    await expect(rows.nth(2)).toHaveText("Certified Personal Trainer");
    await expect(
      page.getByText("Dropped Certified Personal Trainer at position 3."),
    ).toBeAttached();

    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Escape");
    await expect(rows.nth(2)).toHaveText("Certified Personal Trainer");
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
      ["#orbit-explorer", "Orbit Explorer"],
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
    await expect(page.locator(".work-card")).toHaveCount(5);
    await page.getByRole("link", { name: "PyTorch-CKA" }).click();
    await expect(page).toHaveURL(/\/projects\/pytorch-cka$/);
  });

  test("/work opens the Orbit Explorer case study", async ({ page }) => {
    await page.goto("/work");
    await page.getByRole("link", { name: "Orbit Explorer" }).click();
    await expect(page).toHaveURL(/\/projects\/orbit-explorer$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Orbit Explorer" }),
    ).toBeVisible();
    await expect(page.locator(".result")).toHaveCount(4);
    for (const name of [
      /live in the browser/i,
      /ride along with it/i,
      /faster than fiber/i,
      /is Starlink/i,
      /not evenly/i,
      /to the Moon/i,
      /can call home/i,
      /290 around Saturn/i,
      /to 100,000 au/i,
      /checked to 0\.1 mm/i,
      /between samples/i,
    ]) {
      await expect(
        page.getByRole("heading", { level: 2, name }),
      ).toBeAttached();
    }
  });

  for (const path of [
    "/",
    "/work",
    "/experience/abc-fitness",
    "/projects/orbit-explorer",
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
