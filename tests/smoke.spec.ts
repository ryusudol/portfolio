import { expect, test } from "@playwright/test";

test.describe("portfolio smoke", () => {
  test("home page renders core sections", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("site-shell")).toBeVisible();
    await expect(page.getByTestId("hero-copy")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Selected Work" }),
    ).toBeVisible();
    await expect(page.getByTestId("project-card").first()).toBeVisible();
  });

  test("selected work routes open project case studies", async ({ page }) => {
    await page.goto("/");

    const firstProject = page.getByTestId("project-card").first();
    await expect(firstProject).toBeVisible();
    await firstProject.click();

    await expect(page).toHaveURL(/\/work\//);
    await expect(
      page.getByRole("link", { name: /back to selected work/i }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("unlearning and cka case studies are reachable", async ({ page }) => {
    await page.goto("/work/machine-unlearning-comparator");
    await expect(
      page.getByRole("heading", { name: "Machine Unlearning Comparator" }),
    ).toBeVisible();

    await page.goto("/work/pytorch-cka");
    await expect(
      page.getByRole("heading", { name: "PyTorch-CKA" }),
    ).toBeVisible();
  });

  test("home page renders playground section", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("playground-section")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Playground" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /explore ui craft/i }),
    ).toBeVisible();
  });

  test("playground routes render ui craft workspace", async ({ page }) => {
    await page.goto("/playground");
    await expect(page).toHaveURL(/\/playground\/ui$/);
    await expect(page.getByRole("heading", { name: "UI Craft" })).toBeVisible();
    await expect(page.getByTestId("ui-craft-workspace")).toBeVisible();
    await expect(page.getByTestId("ui-craft-card")).toHaveCount(3);
    await expect(page.getByTestId("ui-craft-demo")).toHaveCount(3);
    await expect(page.getByTestId("profile-menu-trigger")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "View Blog Card" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "View Profile Card" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "View Testimonial Card" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /back to playground/i }),
    ).toBeVisible();
  });

  test("ui craft cards open dedicated component pages", async ({ page }) => {
    await page.goto("/playground/ui");

    await page.getByRole("link", { name: "View Blog Card" }).click();
    await expect(page).toHaveURL(/\/playground\/ui\/blog-card$/);
    await expect(page.getByTestId("ui-craft-stage")).toHaveAttribute(
      "data-slug",
      "blog-card",
    );
    await expect(page.getByTestId("profile-menu-trigger")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Blog Card", exact: true }),
    ).toBeAttached();
    await expect(
      page.getByRole("link", { name: /back to ui craft/i }),
    ).toBeVisible();

    await page.getByRole("link", { name: /back to ui craft/i }).click();
    await expect(page).toHaveURL(/\/playground\/ui$/);
    await expect(page.getByTestId("ui-craft-workspace")).toBeVisible();
  });
});
