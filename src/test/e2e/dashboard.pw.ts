import { expect, test } from "@playwright/test";
import { mockBronzeApi } from "../fixtures/bronzeApi";

test.beforeEach(async ({ page }) => {
  await mockBronzeApi(page);
  await page.goto("/");
});

test("supports the primary production and report workflows", async ({ page }) => {
  await expect(page.getByRole("table", { name: "Production Summary" })).toBeVisible();
  await expect(page.getByLabel("Production overview").getByText("$40.00")).toBeVisible();

  const filterBounds = await page.locator(".filter-bar").boundingBox();
  const summaryBounds = await page.locator("#summary").boundingBox();
  const metricBounds = await page.locator(".metric-grid").boundingBox();
  expect(filterBounds).not.toBeNull();
  expect(summaryBounds).not.toBeNull();
  expect(metricBounds).not.toBeNull();
  expect(Math.abs(filterBounds!.x - summaryBounds!.x)).toBeLessThan(1);
  expect(Math.abs(filterBounds!.width - summaryBounds!.width)).toBeLessThan(1);
  expect(metricBounds!.y).toBeGreaterThanOrEqual(filterBounds!.y + filterBounds!.height);

  await page.getByRole("button", { name: "Filter" }).click();
  await page.getByLabel("Input pieces").uncheck();
  await expect(page.getByRole("columnheader", { name: "Input pieces" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Deselect All" })).toHaveCount(0);

  await page.getByRole("button", { name: "Switch to visual view" }).click();
  await expect(page.getByLabel("Relative board dimensions by width and length")).toBeVisible();

  await page.getByRole("button", { name: "View report" }).click();
  await expect(page.locator(".detail-name")).toHaveText("tally260807-01.txt");
  await page.getByRole("button", { name: /Raw report JSON/ }).click();
  await expect(page.getByText(/"file_id": 7/)).toBeVisible();
  await page.getByRole("button", { name: "Back to reports" }).click();
  await expect(page.getByRole("table", { name: "Report files" })).toBeVisible();
});

test("keeps navigation usable at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.getByRole("link", { name: "Reports" }).click();
  await expect(page).toHaveURL(/#reports$/);
  await expect(page.getByRole("table", { name: "Report files" })).toBeVisible();
});
