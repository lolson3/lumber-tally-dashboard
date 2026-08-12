import { expect, test } from "@playwright/test";
import { mockBronzeApi } from "../fixtures/bronzeApi";

test.beforeEach(async ({ page }) => {
  await mockBronzeApi(page);
  await page.goto("/");
});

test("supports the primary production and report workflows", async ({ page }) => {
  await page.getByRole("button", { name: "All Dates" }).click();
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

  await page.getByRole("button", { name: "Switch to boards view" }).click();
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
  await page.getByRole("button", { name: "All Dates" }).click();
  await page.getByRole("link", { name: "Reports" }).click();
  await expect(page).toHaveURL(/#reports$/);
  await expect(page.getByRole("table", { name: "Report files" })).toBeVisible();
});

test("labels the output and rejects section", async ({ page }) => {
  const link = page.getByRole("link", { name: "Output & Rejects" });
  await expect(link).toHaveAttribute("href", "#output&rejects");
  await link.click();
  await expect(page).toHaveURL(/#output&rejects$/);
});

test("shows chart tooltips above dashboard panels", async ({ page }) => {
  await page.getByRole("button", { name: "All Dates" }).click();
  const productBar = page.getByLabel("Piece count by product dimensions").locator(".recharts-bar-rectangle").first();
  const percentageLabel = page.getByLabel("Piece count by product dimensions").locator(".product-bar-label").first();
  await expect(percentageLabel).toBeVisible();
  await expect(percentageLabel).toContainText("100%");
  await productBar.hover();
  await expect(percentageLabel).toBeVisible();
  await productBar.hover({ position: { x: 4, y: 4 } });
  await expect(percentageLabel).toBeVisible();
  const productTooltip = page.locator("body > .floating-chart-tooltip");
  await expect(productTooltip).toBeVisible();
  await expect(productTooltip).toContainText("pieces");
  await expect(productTooltip).toContainText("board feet");

  const mixBar = page.getByLabel("Board feet by Grade bar chart").locator(".recharts-bar-rectangle").first();
  await mixBar.hover();
  const visibleTooltip = page.locator("body > .recharts-tooltip-wrapper:visible");
  await expect(visibleTooltip).toContainText("Board feet");

  await page.getByRole("button", { name: "Switch to boards view" }).click();
  await page.locator(".board-shape").first().hover();
  const boardTooltip = page.locator("body > .floating-chart-tooltip");
  await expect(boardTooltip).toBeVisible();
  await expect(boardTooltip).toContainText("Grade 2");
});
