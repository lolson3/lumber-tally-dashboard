import type { Page, Route } from "@playwright/test";

const report = {
  file_id: 7,
  filename: "tally260807-01.txt",
  filename_date: "2026-08-07",
  report_datetime: "2026-08-07 12:00:00",
};

const resources: Record<string, unknown[]> = {
  files: [report],
  summary: [{ file_id: 7, board_input_pieces: 10, board_input_cuft: 20, edger_bd_ft: 30, lumber_value: 40, recovery_bf_cf: 9.5 }],
  solutions: [{ file_id: 7, solution_number: 1, board_count: 4 }],
  "reject-reasons": [{ file_id: 7, reason: "No Decision", count: 2 }],
  "detail-lines": [{ file_id: 7, wood_type: "RdWd", thickness: "5/8", width: 4, grade: "#2", length_ft: 6, pieces: 3, bd_ft: 9 }],
};

async function fulfillJson(route: Route, value: unknown) {
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(value) });
}

export async function mockBronzeApi(page: Page) {
  await page.route("**/api/bronze/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/tables")) {
      await fulfillJson(route, { tables: Object.entries(resources).map(([name, rows]) => ({
        table_name: `tally__${name.replaceAll("-", "_")}`,
        row_count: rows.length,
      })) });
      return;
    }
    const resource = Object.keys(resources).find((name) => url.pathname.endsWith(`/tally/${name}`));
    if (!resource) throw new Error(`Unhandled API route: ${url.pathname}`);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const limit = Number(url.searchParams.get("limit") ?? 1000);
    const rows = resources[resource].slice(offset, offset + limit).map((payload, id) => ({ id, payload }));
    await fulfillJson(route, { table: `tally__${resource.replaceAll("-", "_")}`, rows, count: rows.length, offset });
  });
}
