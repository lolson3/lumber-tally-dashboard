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
  const filterFieldLayout = await page.locator(".filter-bar form").evaluate((form) => {
    const formBounds = form.getBoundingClientRect();
    const fields = Array.from(form.querySelectorAll(":scope > label")).slice(0, 3).map((field) => field.getBoundingClientRect());
    return {
      oneRow: new Set(fields.map((field) => Math.round(field.top))).size === 1,
      contained: fields.every((field) => field.left >= formBounds.left && field.right <= formBounds.right + 1),
    };
  });
  expect(filterFieldLayout).toEqual({ oneRow: true, contained: true });
  await page.getByRole("button", { name: "Open dashboard menu" }).click();
  const navigationLayout = await page.getByRole("navigation", { name: "Dashboard sections" }).evaluate((navigation) => ({
    clientWidth: navigation.clientWidth,
    scrollWidth: navigation.scrollWidth,
    linkRows: new Set(Array.from(navigation.querySelectorAll("a"), (link) => link.getBoundingClientRect().top)).size,
    lastRowCenterOffset: (() => {
      const navigationBounds = navigation.getBoundingClientRect();
      const links = Array.from(navigation.querySelectorAll("a"));
      const lastTop = links.at(-1)?.getBoundingClientRect().top;
      const lastRow = links.filter((link) => link.getBoundingClientRect().top === lastTop);
      const left = lastRow[0].getBoundingClientRect().left;
      const right = lastRow.at(-1)!.getBoundingClientRect().right;
      return Math.abs((left + right) / 2 - (navigationBounds.left + navigationBounds.right) / 2);
    })(),
  }));
  expect(navigationLayout.scrollWidth).toBeLessThanOrEqual(navigationLayout.clientWidth);
  expect(navigationLayout.linkRows).toBeGreaterThan(1);
  expect(navigationLayout.lastRowCenterOffset).toBeLessThan(1);
  const brandLayout = await page.locator(".brand-mobile-name").evaluate((brand) => {
    const brandBounds = brand.getBoundingClientRect();
    const sidebarBounds = brand.closest(".sidebar")!.getBoundingClientRect();
    const menuBounds = brand.closest(".sidebar")!.querySelector(".menu-toggle")!.getBoundingClientRect();
    return {
      insideSidebar: brandBounds.left >= sidebarBounds.left && brandBounds.right <= sidebarBounds.right,
      gapBeforeMenu: menuBounds.left - brandBounds.right,
    };
  });
  expect(brandLayout.insideSidebar).toBe(true);
  expect(brandLayout.gapBeforeMenu).toBeGreaterThanOrEqual(8);

  const gradeChart = page.getByLabel("Board feet by Grade bar chart");
  await expect(gradeChart).toBeVisible();
  const chartBounds = await gradeChart.boundingBox();
  expect(chartBounds).not.toBeNull();
  expect(chartBounds!.width).toBeGreaterThan(250);
  expect(chartBounds!.height).toBeGreaterThanOrEqual(300);

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

test("does not retain production Bronze tables in IndexedDB", async ({ page }) => {
  await page.getByRole("button", { name: "All Dates" }).click();
  await expect(page.getByLabel("Board feet by Grade bar chart")).toBeVisible();

  await expect.poll(() => page.evaluate(async () => {
    const databases = await indexedDB.databases();
    return databases.some((database) => database.name === "lumber-tally-dashboard-sequoia");
  })).toBe(false);

  // Simulate an upgrade from a release that persisted production data.
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("lumber-tally-dashboard-sequoia", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("bronze-tables", { keyPath: "table" });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("bronze-tables", "readwrite");
      transaction.objectStore("bronze-tables").put({ table: "tally__files", rowCount: 1, rows: [{ file_id: 7 }] });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  });

  const tableRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/tally\/(files|summary|reject-reasons|detail-lines)/.test(request.url())) tableRequests.push(request.url());
  });
  await page.reload();
  await page.getByRole("button", { name: "All Dates" }).click();
  await expect(page.getByRole("table", { name: "Production Summary" })).toBeVisible();
  expect(tableRequests.length).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(async () => {
    const databases = await indexedDB.databases();
    return databases.some((database) => database.name === "lumber-tally-dashboard-sequoia");
  })).toBe(false);
});

test("publishes install metadata and activates its service worker", async ({ page, request }) => {
  const offlineErrors: string[] = [];
  page.on("pageerror", (error) => offlineErrors.push(error.message));
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/icons/apple-touch-icon.png");

  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({
    name: "Lumber Tally Dashboard",
    display: "standalone",
    start_url: "/",
  });
  expect(manifest.icons).toHaveLength(4);

  const serviceWorkerScope = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.scope;
  });
  expect(serviceWorkerScope).toBe(new URL("/", page.url()).href);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  const cachedUrls = await page.evaluate(async () => (await caches.open("lumber-tally-shell-v2")).keys().then((requests) => requests.map((request) => request.url)));
  expect(cachedUrls.some((url) => /\/assets\/index-.*\.js$/.test(url))).toBe(true);
  expect(cachedUrls.some((url) => /\/assets\/index-.*\.css$/.test(url))).toBe(true);

  await page.context().setOffline(true);
  await page.reload();
  await expect(page).toHaveTitle("Lumber Tally Dashboard");
  await page.waitForTimeout(500);
  expect(offlineErrors).toEqual([]);
  await expect(page.getByRole("heading", { name: "Choose Report Dates" })).toBeVisible();
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
  await page.mouse.move(2, 2);
  await expect(productTooltip).toHaveCount(0);

  const mixBar = page.getByLabel("Board feet by Grade bar chart").locator(".recharts-bar-rectangle").first();
  await mixBar.scrollIntoViewIfNeeded();
  await mixBar.hover();
  const visibleTooltip = page.locator("body > .recharts-tooltip-wrapper:visible");
  await expect(visibleTooltip).toContainText("Board feet");

  await page.getByRole("button", { name: "Switch to boards view" }).click();
  await page.locator(".board-shape").first().hover();
  const boardTooltip = page.locator("body > .floating-chart-tooltip");
  await expect(boardTooltip).toBeVisible();
  await expect(boardTooltip).toContainText("Grade 2");
});

test("keeps mobile metric and data panels balanced and bounded", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 844 });
  await page.reload();
  await page.getByRole("button", { name: "All Dates" }).click();

  const gridBounds = await page.locator(".metric-grid").boundingBox();
  const finalMetricBounds = await page.locator(".metric-card").last().boundingBox();
  expect(gridBounds).not.toBeNull();
  expect(finalMetricBounds).not.toBeNull();
  expect(Math.abs(finalMetricBounds!.width - gridBounds!.width)).toBeLessThan(1);

  const summaryBounds = await page.locator("#summary").boundingBox();
  const reportsBounds = await page.locator("#reports").boundingBox();
  expect(summaryBounds).not.toBeNull();
  expect(reportsBounds).not.toBeNull();
  expect(summaryBounds!.height).toBeLessThanOrEqual(560);
  expect(reportsBounds!.height).toBeGreaterThanOrEqual(700);
  await expect(page.locator("#summary .table-scroll").first()).toHaveCSS("overflow-y", "auto");
  await expect(page.locator("#reports .table-scroll").first()).toHaveCSS("overflow-y", "auto");
});

test("positions mobile shortcuts below the sticky header", async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 844 });
  for (const target of [
    { label: "Summary", id: "summary", maximumTop: 90 },
    { label: "Product Breakdown", id: "product-breakdown", maximumTop: 90 },
    { label: "Output & Rejects", id: "output&rejects", maximumTop: 90 },
    { label: "Reports", id: "reports", maximumTop: 90 },
  ]) {
    await page.getByRole("button", { name: "Open dashboard menu" }).click();
    await page.getByRole("link", { name: target.label }).click();
    await expect(page).toHaveURL(new RegExp(`#${target.id.replace("&", "\\&")}$`));
    const section = page.locator(`[id="${target.id}"]`);
    await expect.poll(() => section.evaluate((element) => Math.round(element.getBoundingClientRect().top)))
      .toBeLessThanOrEqual(target.maximumTop);
    expect(await section.evaluate((element) => Math.round(element.getBoundingClientRect().top)))
      .toBeGreaterThanOrEqual(78);
  }
});

test("dismisses touch tooltips when mobile scrolling begins", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "All Dates" }).click();
  await page.getByRole("button", { name: "Switch to boards view" }).click();
  const board = page.locator(".board-shape").first();
  await board.dispatchEvent("pointerdown", { pointerType: "touch", clientX: 180, clientY: 300 });
  await expect(page.locator("body > .floating-chart-tooltip")).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new TouchEvent("touchmove", { bubbles: true })));
  await expect(page.locator("body > .floating-chart-tooltip")).toHaveCount(0);
});
