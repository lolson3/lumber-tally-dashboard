import { afterEach, describe, expect, it, vi } from "vitest";
import { tallyApi } from "./client";

describe("tallyApi", () => {
  afterEach(() => vi.restoreAllMocks());

  it("adds date filters and maximum page size to file requests", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }),
    );

    await tallyApi.files({ start: "2026-07-01", end: "2026-07-31" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/files?limit=5000&offset=0&start=2026-07-01&end=2026-07-31",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });

  it("requests aggregated solution totals", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }),
    );

    await tallyApi.solutionTotals({ start: "", end: "" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/solutions?totals=true&limit=5000&offset=0",
      expect.any(Object),
    );
  });
});
