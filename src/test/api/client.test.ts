import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NetworkError, ResponseFormatError, resetTallyApiCache, tallyApi } from "../../api/client";

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

function page(payloads: unknown[], offset = 0) {
  return json({ table: "test", rows: payloads.map((payload, id) => ({ id, payload })), count: payloads.length, offset });
}

const tableCounts = {
  tables: [
    { table_name: "tally__files", row_count: 2 },
    { table_name: "tally__summary", row_count: 2 },
    { table_name: "tally__solutions", row_count: 3 },
    { table_name: "tally__reject_reasons", row_count: 1 },
    { table_name: "tally__detail_lines", row_count: 2 },
  ],
};

function installFixtureApi() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/tables")) return json(tableCounts);
    if (url.includes("/files?")) return page([
      { file_id: 2, filename: "new.txt", filename_date: "2026-08-02", report_datetime: "2026-08-02 12:00:00" },
      { file_id: 1, filename: "old.txt", filename_date: "2026-07-01", report_datetime: "2026-07-01 12:00:00" },
    ]);
    if (url.includes("/summary?")) return page([{ file_id: 2, board_input_pieces: 20, recovery_bf_cf: 9.5 }, { file_id: 1, board_input_pieces: 10 }]);
    if (url.includes("/solutions?")) return page([{ file_id: 2, solution_number: 1, board_count: 8 }, { file_id: 2, solution_number: 1, board_count: 7 }, { file_id: 1, solution_number: 1, board_count: 5 }]);
    if (url.includes("/reject-reasons?")) return page([{ file_id: 2, reason: "No Decision", count: 4 }]);
    if (url.includes("/detail-lines?")) return page([
      { file_id: 2, wood_type: "RdWd", thickness: "5/8", width: 4, grade: "#2", length_ft: 6, pieces: 3, bd_ft: 9 },
      { file_id: 2, wood_type: "RdWd", thickness: "5/8", width: 4, grade: "#3", length_ft: 6, pieces: 1, bd_ft: 2 },
    ]);
    throw new Error(`Unexpected request: ${url}`);
  });
}

describe("tallyApi bronze adapter", () => {
  beforeEach(resetTallyApiCache);
  afterEach(() => vi.restoreAllMocks());

  it("reproduces date-filtered dashboard data and aggregations", async () => {
    const fetchMock = installFixtureApi();
    const range = { start: "2026-08-01", end: "2026-08-31" };
    await expect(tallyApi.files(range)).resolves.toMatchObject([{ file_id: 2 }]);
    await expect(tallyApi.productionSummary(range)).resolves.toMatchObject([{ file_id: 2, filename: "new.txt", board_input_pieces: 20 }]);
    await expect(tallyApi.recovery(range)).resolves.toMatchObject([{ file_id: 2, recovery_bf_cf: 9.5 }]);
    await expect(tallyApi.solutionTotals(range)).resolves.toEqual([{ solution_number: 1, total_board_count: 15 }]);
    await expect(tallyApi.rejectReasonTotals(range)).resolves.toEqual([{ reason: "No Decision", total_count: 4 }]);
    await expect(tallyApi.gradeMix(range, "grade")).resolves.toEqual([
      { grade: "#2", total_pieces: 3, total_bd_ft: 9 },
      { grade: "#3", total_pieces: 1, total_bd_ft: 2 },
    ]);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/tables"))).toHaveLength(1);
  });

  it("constructs a complete report from all bronze tables", async () => {
    installFixtureApi();
    await expect(tallyApi.file(2)).resolves.toMatchObject({
      file_id: 2,
      summary: { board_input_pieces: 20 },
      solutions: [{ solution_number: 1, board_count: 8 }, { solution_number: 1, board_count: 7 }],
      reject_reasons: [{ reason: "No Decision", count: 4 }],
      detail_lines: [{ grade: "#2", pieces: 3 }, { grade: "#3", pieces: 1 }],
    });
    await expect(tallyApi.file(999)).rejects.toMatchObject({ status: 404 });
  });

  it("requests every advertised row in 1,000-row pages", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/tables")) return json({ tables: [{ table_name: "tally__files", row_count: 1001 }] });
      const offset = Number(new URL(url, "http://test").searchParams.get("offset"));
      return page(offset === 0 ? Array.from({ length: 1000 }, (_, index) => ({ file_id: index + 1, report_datetime: "2026-08-01" })) : [{ file_id: 1001, report_datetime: "2026-08-01" }], offset);
    });
    await expect(tallyApi.files({ start: "", end: "" })).resolves.toHaveLength(1001);
    expect(fetchMock).toHaveBeenCalledWith("/api/bronze/tally/files?limit=1000&offset=0", expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith("/api/bronze/tally/files?limit=1000&offset=1000", expect.any(Object));
  });

  it("shares in-flight and cached table requests", async () => {
    const fetchMock = installFixtureApi();
    await Promise.all([tallyApi.files({ start: "", end: "" }), tallyApi.files({ start: "", end: "" })]);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/files?"))).toHaveLength(1);
  });

  it("reports HTTP, network, malformed JSON, and metadata errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(json({ detail: "denied" }, 403));
    await expect(tallyApi.health()).rejects.toMatchObject({ status: 403 });

    resetTallyApiCache();
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new TypeError("offline"));
    await expect(tallyApi.health()).rejects.toBeInstanceOf(NetworkError);

    resetTallyApiCache();
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(new Response("not json", { status: 200 }));
    await expect(tallyApi.health()).rejects.toBeInstanceOf(ResponseFormatError);

    resetTallyApiCache();
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(json({ tables: [] }));
    await expect(tallyApi.files({ start: "", end: "" })).rejects.toBeInstanceOf(ResponseFormatError);
  });
});
