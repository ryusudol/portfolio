import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

async function waitForTheme(page: Page) {
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-ready",
    "true",
  );
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const root = document.documentElement;
        return (
          Math.max(root.scrollWidth, document.body.scrollWidth) -
          root.clientWidth
        );
      }),
    )
    .toBeLessThanOrEqual(1);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("presents the recruiter-focused portfolio in the planned order", async ({
  page,
}) => {
  await expect(page).toHaveTitle("Suhyeon Yu — Software Engineer");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Suhyeon Yu",
  );
  const hero = page.locator("#home");
  await expect(hero.locator(".hero-copy p")).toHaveCount(3);
  await expect(
    hero.getByText(
      "I'm a frontend-focused software engineer crafting web experiences for both humans and agents.",
      { exact: false },
    ),
  ).toBeVisible();
  await expect(hero.getByText("ABC Fitness", { exact: true })).toBeVisible();
  await expect(
    hero.getByText("Rice University", { exact: true }),
  ).toBeVisible();
  await expect(hero.getByText("5,000+ people", { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue("--background")
          .trim(),
      ),
    )
    .toBe("#f9fafc");
  await expect(page.locator("main section h2")).toHaveText([
    "Experience",
    "Selected Work",
    "Education & Recognition",
    "Tech Stack",
  ]);

  await expect(
    page.locator(".experience-item").getByRole("heading", { level: 3 }),
  ).toHaveText([
    "Software Engineering Intern at ABC Fitness",
    "Research Intern at Intelligent Data Computing Lab @ SKKU",
    "Frontend Engineering Intern at Department of CSE @ SKKU",
  ]);

  await expect(
    page.locator(".project-card").getByRole("heading", { level: 3 }),
  ).toHaveText([
    "Trainerize Profile Experience",
    "Unlearning Comparator",
    "PyTorch-CKA",
  ]);

  await expect(page.getByText("2026 — Present", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      "Portfolio visuals are reconstructed; proprietary product details remain private.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByText("Internal", { exact: false })).toHaveCount(0);
  await expect(
    page.getByText("Private product work", { exact: true }),
  ).toHaveCount(0);

  await expect(page.locator('.company-logo[src*="abc-fitness"]')).toHaveCount(
    1,
  );
  await expect(
    page.locator('.company-mark[data-company="abc"] .company-logo'),
  ).toHaveCSS("object-fit", "contain");
  const abcMark = page.locator('.company-mark[data-company="abc"]');
  expect(
    await abcMark.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return Math.abs(rect.width - rect.height);
    }),
  ).toBeLessThan(1);
  await expect(page.locator('.company-logo[src*="skku"]')).toHaveCount(2);
  await expect(page.locator(".tag-list img, .tag-list svg")).not.toHaveCount(0);
  await expect(page.locator(".technology-grid .technology-icon")).toHaveCount(
    12,
  );
});

test("profile pill supports hover, shortcut, keyboard navigation, and escape", async ({
  page,
}) => {
  const trigger = page.getByTestId("profile-menu-trigger");
  await trigger.hover();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("navigation", { name: "Portfolio sections" }),
  ).toBeVisible();

  await page.mouse.move(0, 0);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  await trigger.hover();
  await page.getByRole("radio", { name: "Dark", exact: true }).click();
  await page.mouse.move(0, 0);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  await page.keyboard.press("Control+k");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("link", { name: "Home", exact: true }),
  ).toBeFocused();

  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("link", { name: "Experience", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
});

test("profile menu works by click on a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const trigger = page.getByTestId("profile-menu-trigger");
  await trigger.click();
  await expect(
    page.getByRole("navigation", { name: "Portfolio sections" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Selected work", exact: true }).click();
  await expect(page).toHaveURL(/#work$/);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("profile status rotates through role, availability, and email", async ({
  page,
}) => {
  const currentStatus = page.locator(
    '.profile-menu-status-item[data-state="current"]',
  );
  await expect(currentStatus).toHaveText("Software Engineer");
  await expect(currentStatus).toContainText("Seeking new-grad SWE roles", {
    timeout: 5_000,
  });
});

test("social popover slides between GitHub and LinkedIn", async ({ page }) => {
  const socialLinks = page.getByRole("navigation", {
    name: "Contact and profile links",
  });
  const popover = page.locator(".social-popover");

  await page.getByRole("link", { name: "Suhyeon Yu on GitHub" }).hover();
  await expect(socialLinks).toHaveAttribute("data-active", "github");
  await expect
    .poll(() =>
      popover.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).opacity),
      ),
    )
    .toBeGreaterThan(0.9);
  await expect(page.locator(".contribution-grid i")).toHaveCount(371);
  await expect(page.locator(".contribution-grid [data-date]")).toHaveCount(365);
  await expect(
    page.getByText(/479 contributions in the last year/),
  ).toBeVisible();
  const busiestDay = page.locator('[data-date="2026-06-02"]');
  await expect(busiestDay).toHaveAttribute("data-count", "39");
  await expect(busiestDay).toHaveAttribute("data-level", "4");
  await expect(
    page.getByRole("link", { name: "Open Suhyeon Yu's résumé" }),
  ).toContainText("Résumé");
  const [copyHeight, resumeHeight] = await Promise.all([
    page
      .getByRole("button", { name: "Copy email" })
      .evaluate((element) => element.getBoundingClientRect().height),
    page
      .getByRole("link", { name: "Open Suhyeon Yu's résumé" })
      .evaluate((element) => element.getBoundingClientRect().height),
  ]);
  expect(Math.abs(copyHeight - resumeHeight)).toBeLessThan(1);
  await expect(
    page
      .locator(".social-popover-panel--linkedin")
      .getByText("Software Engineer", { exact: true }),
  ).toBeAttached();
  const githubLeft = await popover.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).left),
  );
  const githubWidth = await popover.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).width),
  );
  const githubHeight = await popover.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).height),
  );

  await page.getByRole("link", { name: "Suhyeon Yu on LinkedIn" }).hover();
  await expect(socialLinks).toHaveAttribute("data-active", "linkedin");
  await expect(socialLinks).toHaveAttribute("data-direction", "forward");
  await expect(socialLinks).toHaveAttribute("data-switching", "true");
  await expect(
    page.getByRole("link", { name: "Connect", exact: true }),
  ).toHaveAttribute("href", "https://www.linkedin.com/in/suhyeon-yu");
  await expect
    .poll(() =>
      popover.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).left),
      ),
    )
    .toBeGreaterThan(githubLeft + 20);
  await expect
    .poll(() =>
      popover.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).width),
      ),
    )
    .toBeLessThan(githubWidth - 20);
  await expect
    .poll(() =>
      popover.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).height),
      ),
    )
    .toBeGreaterThan(githubHeight + 10);
  await expect
    .poll(() =>
      page
        .locator(".social-popover-panel--linkedin")
        .evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).opacity),
        ),
    )
    .toBeGreaterThan(0.9);

  await page.getByRole("link", { name: "Suhyeon Yu on GitHub" }).hover();
  await expect(socialLinks).toHaveAttribute("data-direction", "backward");

  await busiestDay.hover();
  await expect(page.getByRole("tooltip")).toContainText(
    "39 contributions · June 2",
  );
  await popover.hover();
  await expect(socialLinks).toHaveAttribute("data-active", "github");

  await page.mouse.move(0, 0);
  await expect(socialLinks).toHaveAttribute("data-active", "none");
});

test("hovering a technology dims the rest of the stack", async ({ page }) => {
  const technologies = page.locator(".technology-grid li");
  const activeTechnology = technologies.first();
  const otherTechnology = technologies.nth(1);
  const backgroundBefore = await activeTechnology.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );

  await activeTechnology.hover();
  await expect
    .poll(() =>
      otherTechnology.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).opacity),
      ),
    )
    .toBeGreaterThan(0.45);
  expect(
    await activeTechnology.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).opacity),
    ),
  ).toBe(1);
  await expect(activeTechnology).toHaveCSS(
    "background-color",
    backgroundBefore,
  );

  await page.mouse.move(0, 0);
  await expect
    .poll(() =>
      otherTechnology.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).opacity),
      ),
    )
    .toBeGreaterThan(0.9);
});

test("hovering selected work dims the other project cards", async ({
  page,
}) => {
  const cards = page.locator(".project-card");
  const activeCard = cards.first();
  const otherCard = cards.nth(1);

  await activeCard.hover();
  await expect
    .poll(() =>
      otherCard.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).opacity),
      ),
    )
    .toBeLessThan(0.4);
  await expect
    .poll(() =>
      otherCard.evaluate((element) => getComputedStyle(element).filter),
    )
    .toContain("grayscale");

  await page.mouse.move(0, 0);
  await expect
    .poll(() =>
      otherCard.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).opacity),
      ),
    )
    .toBeGreaterThan(0.9);
});

test("project cards lead to dedicated case-study pages", async ({ page }) => {
  const routes = [
    {
      name: "View Trainerize Profile Experience project",
      path: "/work/trainerize-profile-experience",
      title: "Trainerize Profile Experience",
    },
    {
      name: "View Unlearning Comparator project",
      path: "/work/unlearning-comparator",
      title: "Unlearning Comparator",
    },
    {
      name: "View PyTorch-CKA project",
      path: "/work/pytorch-cka",
      title: "PyTorch-CKA",
    },
  ];

  for (const route of routes) {
    await page.goto("/");
    const card = page.getByRole("link", { name: route.name, exact: true });
    await expect(card).toHaveAttribute("href", route.path);
    await card.click();
    await expect(page).toHaveURL(route.path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      route.title,
    );
    await expect(
      page.getByRole("link", { name: "Back to selected work", exact: true }),
    ).toHaveAttribute("href", "/#work");
    await expectNoHorizontalOverflow(page);
  }
});

test("project cards are simplified and the source card has clear copy", async ({
  page,
}) => {
  await expect(page.locator(".project-metric")).toHaveCount(0);
  await expect(
    page.getByText(
      "See the source code of more experiments and open-source work on",
      { exact: true },
    ),
  ).toBeVisible();

  const separators = page.locator(".wave-separator");
  await expect(separators).toHaveCount(5);
  const separatorMask = await separators
    .first()
    .evaluate((element) => getComputedStyle(element).maskImage);
  expect(separatorMask).not.toBe("none");
});

test("project detail pages keep proprietary and public work distinct", async ({
  page,
}) => {
  await page.goto("/work/trainerize-profile-experience");
  await expect(
    page.getByText("Confidentiality note", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", {
      name: "Trainerize Profile Experience external links",
    }),
  ).toHaveCount(0);

  await page.goto("/work/unlearning-comparator");
  await expect(
    page.getByRole("navigation", {
      name: "Unlearning Comparator external links",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/gnueaj/Machine-Unlearning-Comparator",
  );
});

test("theme follows the system and persists an explicit choice", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await waitForTheme(page);
  await expect(page.locator("html")).toHaveAttribute(
    "data-resolved-theme",
    "dark",
  );

  await page.getByTestId("profile-menu-trigger").click();
  await page.getByRole("radio", { name: "Light", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("html")).toHaveAttribute(
    "data-resolved-theme",
    "light",
  );

  await page.reload();
  await waitForTheme(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("copy email provides clipboard confirmation", async ({
  context,
  page,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy email" }).click();
  const copiedButton = page.getByRole("button", { name: "Email copied" });
  await expect(copiedButton).toContainText("Email copied!");
  await expect(copiedButton).toHaveAttribute("data-copied", "true");
  await expect
    .poll(() =>
      copiedButton
        .locator(".copy-icon--success")
        .evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).opacity),
        ),
    )
    .toBeGreaterThan(0.9);
  await expect
    .poll(() =>
      copiedButton
        .locator(".copy-icon--default")
        .evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).opacity),
        ),
    )
    .toBeLessThan(0.1);
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe("suhyeon.yu.2789@gmail.com");
});

test("public links and résumé are available and safely attributed", async ({
  page,
}) => {
  const resume = await page.request.get("/documents/Suhyeon-Yu-Resume.pdf");
  expect(resume.ok()).toBeTruthy();
  expect(resume.headers()["content-type"]).toContain("application/pdf");

  await expect(
    page.getByRole("link", { name: "Suhyeon Yu on GitHub" }),
  ).toHaveAttribute("href", "https://github.com/ryusudol");
  await expect(
    page.getByRole("link", { name: "Suhyeon Yu on LinkedIn" }),
  ).toHaveAttribute("href", "https://www.linkedin.com/in/suhyeon-yu");
  await expect(
    page.getByRole("link", { name: "Open Suhyeon Yu's résumé" }),
  ).toHaveAttribute("href", "/documents/Suhyeon-Yu-Resume.pdf");

  const unsafeExternalLinks = await page
    .locator('a[target="_blank"]')
    .evaluateAll(
      (links) =>
        links.filter((link) => {
          const rel = link.getAttribute("rel") ?? "";
          return !rel.includes("noopener") || !rel.includes("noreferrer");
        }).length,
    );
  expect(unsafeExternalLinks).toBe(0);
});

test("is responsive without horizontal overflow", async ({ page }) => {
  const viewports = [
    { width: 1440, height: 900 },
    { width: 820, height: 1180 },
    { width: 390, height: 844 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByTestId("profile-menu-trigger")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
});

test("passes automated accessibility checks", async ({ page }) => {
  await waitForTheme(page);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("respects reduced-motion preferences", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const duration = await page
    .locator(".site-shell")
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).animationDuration),
    );
  expect(duration).toBeLessThanOrEqual(0.001);
});
