import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const projectIds = [
  "trainerize-profile",
  "unlearning-comparator",
  "pytorch-cka",
] as const;

async function waitForTheme(page: Page) {
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-ready",
    "true",
  );
}

async function selectTheme(page: Page, theme: "System" | "Light" | "Dark") {
  const trigger = page.getByTestId("theme-trigger");
  await trigger.click();
  const option = page.getByRole("menuitemradio", {
    name: theme,
    exact: true,
  });
  await expect(option).toBeVisible();
  await option.click();
}

async function selectPanel(
  page: Page,
  panel: "Overview" | "Projects" | "Archive" | "Contact",
) {
  await page.getByRole("tab", { name: panel, exact: true }).click();
  await expect(
    page.getByRole("tab", { name: panel, exact: true }),
  ).toHaveAttribute("aria-selected", "true");
}

async function scrollSectionToTop(page: Page, selector: string) {
  await page.locator(selector).evaluate((element) => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(
      0,
      window.scrollY + element.getBoundingClientRect().top + 4,
    );
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(async () =>
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

test.describe("theme preference", () => {
  test("uses and tracks the system theme by default", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await waitForTheme(page);

    const root = page.locator("html");
    await expect(root).toHaveAttribute("data-theme", "system");
    await expect(root).toHaveAttribute("data-resolved-theme", "dark");

    await page.emulateMedia({ colorScheme: "light" });
    await expect(root).toHaveAttribute("data-resolved-theme", "light");
  });

  test("persists explicit overrides", async ({ page }) => {
    await page.goto("/");
    await waitForTheme(page);
    await selectTheme(page, "Dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.reload();
    await waitForTheme(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});

test("uses a tabbed hero with a persistent black selection", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Suhyeon Yu",
  );
  await expect(page.locator(".hero-introduction")).toHaveText(
    "Frontend-focused software engineer who crafts web experiences for both humans and agents.",
  );

  const tabs = page
    .getByRole("tablist", { name: "Portfolio views" })
    .getByRole("tab");
  await expect(tabs).toHaveText(["Overview", "Projects", "Archive", "Contact"]);
  await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
  await expect(tabs.first()).toHaveCSS("background-color", "rgb(15, 15, 15)");

  const scrollBefore = await page.evaluate(() => window.scrollY);
  await selectPanel(page, "Projects");
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  await expect(page.locator("#portfolio-panel-overview")).toHaveCount(0);
  await expect(page.locator("#portfolio-panel-projects")).toBeVisible();

  const backToTop = page.getByTestId("back-to-top");
  await expect(backToTop).toHaveCount(0);
});

test("supports keyboard tab navigation", async ({ page }) => {
  await page.goto("/");
  const overview = page.getByRole("tab", { name: "Overview" });
  await overview.focus();
  await page.keyboard.press("ArrowRight");

  const projects = page.getByRole("tab", { name: "Projects" });
  await expect(projects).toBeFocused();
  await expect(projects).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#portfolio-panel-projects")).toBeVisible();
});

test("the overview presents the complete portfolio in order", async ({
  page,
}) => {
  await page.goto("/");

  const overview = page.locator("#portfolio-panel-overview");
  await expect(overview).toBeVisible();
  await expect(
    overview.locator(".section-heading").locator(".section-index"),
  ).toHaveText(["01", "02", "03", "04"]);
  await expect(
    overview.locator(".section-heading").locator(".eyebrow"),
  ).toHaveText(["Selected Projects", "Background", "Archive", "Contact"]);
  await expect(
    overview.locator(".project-chapter").getByRole("heading", { level: 3 }),
  ).toHaveText([
    "Modernizing the Trainerize Profile Experience",
    "Unlearning Comparator",
    "PyTorch-CKA",
  ]);
  await expect(overview.locator("#overview-archive")).toBeVisible();
  await expect(overview.locator("#overview-contact")).toBeVisible();
});

test.describe("project visual rail", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("swaps to each active project visual", async ({ page }) => {
    await page.goto("/");
    await selectPanel(page, "Projects");

    const stage = page.locator("[data-visual-stage]");
    await expect(stage).toHaveAttribute("data-desktop", "true");
    await expect(stage).toHaveAttribute("data-active-visual", "none");

    for (const projectId of projectIds) {
      await scrollSectionToTop(page, `#${projectId}`);
      await expect(stage).toHaveAttribute("data-active-visual", projectId);
      await expect(
        stage.locator(
          `.project-stage-layer:has([data-project-visual="${projectId}"])`,
        ),
      ).toHaveClass(/is-active/);
    }

    await scrollSectionToTop(page, "#trainerize-profile");
    await expect(stage).toHaveAttribute(
      "data-active-visual",
      "trainerize-profile",
    );
  });
});

test("uses inline content on constrained screens", async ({ page }) => {
  const viewports = [
    { width: 820, height: 1180 },
    { width: 390, height: 844 },
    { width: 1024, height: 600 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(`/?size=${viewport.width}x${viewport.height}`);

    const portrait = page.locator(".overview-portrait");
    await expect(portrait).toBeVisible();
    await expect(portrait.getByRole("img")).toHaveAttribute(
      "src",
      /suhyeon-mountain-dithered\.jpg/,
    );

    await selectPanel(page, "Projects");
    const stage = page.locator("[data-visual-stage]");
    await expect(stage).toHaveAttribute("data-desktop", "false");
    await expect(stage).toHaveAttribute("data-active-visual", "none");

    for (const projectId of projectIds) {
      await expect(
        page.locator(
          `#${projectId} .inline-project-visual[data-project-visual="${projectId}"]`,
        ),
      ).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);
  }
});

test("shows the requested featured work without dividers", async ({ page }) => {
  await page.goto("/");
  await selectPanel(page, "Projects");

  const projectsHeading = page.locator(".portfolio-section-heading");
  await expect(projectsHeading.locator(".section-index")).toHaveText("01");
  await expect(projectsHeading.locator(".eyebrow")).toHaveText(
    "Selected Projects",
  );
  await expect(
    page.locator(".project-chapter").getByRole("heading", { level: 3 }),
  ).toHaveText([
    "Modernizing the Trainerize Profile Experience",
    "Unlearning Comparator",
    "PyTorch-CKA",
  ]);

  await expect(page.locator(".project-list")).toHaveCSS(
    "border-top-width",
    "0px",
  );
  await expect(page.locator(".project-heading-row")).toHaveCount(0);
  await expect(
    page.locator(".project-chapter > .project-chapter-inner > .eyebrow"),
  ).toHaveCount(0);

  const firstTitleSize = await page
    .locator(".project-chapter h3")
    .first()
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
  expect(firstTitleSize).toBeLessThanOrEqual(77);
});

test("removes section separators and labels every technology with an icon", async ({
  page,
}) => {
  await page.goto("/");

  for (const selector of [
    "#top",
    "#overview-background",
    "#overview-archive",
    "#overview-contact",
  ]) {
    const section = page.locator(selector);
    await expect(section).toHaveCSS("border-top-width", "0px");
    await expect(section).toHaveCSS("border-bottom-width", "0px");
  }

  const titleRuleDisplay = await page
    .locator(".section-heading")
    .first()
    .evaluate((element) => getComputedStyle(element, "::after").display);
  expect(titleRuleDisplay).toBe("none");

  const technologies = page.locator(
    "#portfolio-panel-overview .technology-list li",
  );
  const technologyCount = await technologies.count();
  expect(technologyCount).toBeGreaterThan(0);
  await expect(
    page.locator("#portfolio-panel-overview .technology-list li svg"),
  ).toHaveCount(technologyCount);
});

test("keeps project demos in their original colors", async ({ page }) => {
  await page.goto("/");
  await waitForTheme(page);
  await selectPanel(page, "Projects");

  const trainerizeMark = page.locator(
    '[data-project-visual="trainerize-profile"] .trainerize-mark',
  );
  const dashboardImage = page.locator(
    '[data-project-visual="unlearning-comparator"] img',
  );
  const heatmap = page.locator(
    '[data-project-visual="pytorch-cka"] .cka-heatmap',
  );

  await expect(trainerizeMark.first()).toHaveCSS(
    "background-color",
    "rgb(11, 107, 79)",
  );
  await expect(dashboardImage.first()).toHaveCSS("filter", "none");
  await expect(heatmap.first().locator("img")).toHaveCSS("filter", "none");
});

test("keeps the full Overview and focused Archive views independent", async ({
  page,
}) => {
  await page.goto("/");

  const overview = page.locator("#portfolio-panel-overview");
  await expect(
    overview.locator("#overview-background .section-index"),
  ).toHaveText("02");
  await expect(overview.getByText("Education", { exact: true })).toBeVisible();
  await expect(
    overview.getByText("Selected skills", { exact: true }),
  ).toBeVisible();

  await selectPanel(page, "Archive");
  await expect(overview).toHaveCount(0);
  const archive = page.locator("#portfolio-panel-archive");
  await expect(archive.locator(".section-heading .section-index")).toHaveText(
    "03",
  );
  await expect(archive.getByRole("link")).toHaveText([
    /Unlearning Comparator/,
    /PyTorch-CKA/,
  ]);
});

test("provides a contact panel with recognizable brand marks", async ({
  page,
}) => {
  await page.goto("/");
  await selectPanel(page, "Contact");
  const contact = page.locator("#portfolio-panel-contact");

  await expect(contact.locator(".section-heading .section-index")).toHaveText(
    "04",
  );
  await expect(
    contact.getByText("You can send a message to my email here."),
  ).toBeVisible();
  await expect(contact.getByLabel("Message")).toHaveAttribute("required", "");

  for (const label of [
    "Email Suhyeon",
    "Suhyeon on LinkedIn",
    "Suhyeon on GitHub",
    "Suhyeon's résumé",
  ]) {
    await expect(contact.getByRole("link", { name: label })).toBeVisible();
    await expect(
      contact.getByRole("link", { name: label }).locator("svg"),
    ).toBeVisible();
  }
});

test("the top control works without horizontal overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("back-to-top")).toHaveCount(0);
  await selectPanel(page, "Projects");
  await scrollSectionToTop(page, "#pytorch-cka");
  const backToTop = page.getByTestId("back-to-top");
  await expect(backToTop).toHaveText("Back to top");
  await expect(backToTop).toHaveAttribute("href", "#top");
  await backToTop.click();
  await expect(page).toHaveURL(/#top$/);
  await expect.poll(async () => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(backToTop).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test.describe("accessibility", () => {
  test("the skip link focuses main content", async ({ page }) => {
    await page.goto("/");
    const skipLink = page.getByRole("link", { name: "Skip to content" });

    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("has no serious or critical Axe findings in either theme", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForTheme(page);

    for (const theme of ["Light", "Dark"] as const) {
      await selectTheme(page, theme);
      const results = await new AxeBuilder({ page }).analyze();
      expect(
        results.violations.filter(
          (violation) =>
            violation.impact === "serious" || violation.impact === "critical",
        ),
      ).toEqual([]);
    }
  });
});
