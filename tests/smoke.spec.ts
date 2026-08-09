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
});
