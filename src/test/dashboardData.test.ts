import { describe, expect, it } from "vitest";
import { adjustedRuntimeHours, buildBoardShapes, buildProductBreakdown, countReportDays, formatRuntimeHours, latestReportDate, mergeProductionRecovery, runtimeHours, runtimePercentage, sortMixRows, sumAdjustedRuntimeHours, sumNullable, sumRuntimeHours } from "../utils/dashboardData";
import { tooltipCoordinates } from "../utils/tooltipPosition";
import { defaultReportRange, evenChartTicks, PRODUCTION_TIME_ZONE, thousandsFormatter } from "../utils/formatting";

describe("dashboard calculations", () => {
  it("defaults to the prior Pacific production day", () => {
    expect(PRODUCTION_TIME_ZONE).toBe("America/Los_Angeles");
    expect(defaultReportRange(new Date("2026-08-13T06:30:00Z"))).toEqual({
      start: "2026-08-11",
      end: "2026-08-11",
    });
    expect(defaultReportRange(new Date("2026-01-01T07:30:00Z"))).toEqual({
      start: "2025-12-30",
      end: "2025-12-30",
    });
  });

  it("formats chart-axis values in thousands", () => {
    expect(thousandsFormatter(250_000)).toBe("250k");
    expect(thousandsFormatter(750_000)).toBe("750k");
    expect(thousandsFormatter(1_000_000)).toBe("1m");
    expect(thousandsFormatter(1_500_000)).toBe("2m");
    expect(thousandsFormatter(750)).toBe("750");
    expect(evenChartTicks(812_970)).toEqual([0, 200_000, 400_000, 600_000, 800_000, 1_000_000]);
  });

  it("counts distinct report days and totals runtime durations", () => {
    expect(countReportDays([
      { file_id: 1, filename: "one", filename_date: "2026-08-01", report_datetime: "2026-08-01 08:00:00" },
      { file_id: 2, filename: "two", filename_date: "2026-08-01", report_datetime: "2026-08-01 12:00:00" },
      { file_id: 3, filename: "three", filename_date: "2026-08-02", report_datetime: "2026-08-02 08:00:00" },
    ])).toBe(2);
    expect(sumRuntimeHours([
      "01:30:00", "2:15", "1 day, 00:15:00", "2 hrs 30 mins", "PT1H30M", 2, null, "invalid",
    ])).toBe(34);
    expect(runtimeHours("08:06:00")).toBeCloseTo(8.1);
    expect(adjustedRuntimeHours("10:30:00")).toBe(9.5);
    expect(adjustedRuntimeHours("00:30:00")).toBe(0);
    expect(sumAdjustedRuntimeHours(["10:30:00", "08:00:00"])).toBe(16.5);
    expect(runtimePercentage("11:30:00")).toBeCloseTo(110.526);
    expect(formatRuntimeHours(adjustedRuntimeHours("08:45:30"))).toBe("07:45:30");
  });

  it("finds the latest available report date", () => {
    expect(latestReportDate([
      { filename_date: "2026-08-09", report_datetime: "2026-08-09 12:00:00" },
      { filename_date: "2026-08-11", report_datetime: "2026-08-11 12:00:00" },
      { report_datetime: "2026-08-10 12:00:00" },
    ])).toBe("2026-08-11");
    expect(latestReportDate([])).toBeNull();
  });

  it("sums nullable values without producing NaN", () => {
    expect(sumNullable([10, null, undefined, 2.5])).toBe(12.5);
    expect(sumNullable([])).toBe(0);
  });

  it("merges recovery fields by file id and leaves unmatched rows empty", () => {
    const rows = mergeProductionRecovery(
      [
        { file_id: 2, filename: "two", report_datetime: "2026-08-02" },
        { file_id: 1, filename: "one", report_datetime: "2026-08-01" },
      ],
      [{ file_id: 2, report_datetime: "2026-08-02", recovery_bf_cf: 9.5, fiber_ratio: 0.6 }],
    );
    expect(rows[0]).toMatchObject({ file_id: 2, recovery_bf_cf: 9.5, fiber_ratio: 0.6 });
    expect(rows[1].recovery_bf_cf).toBeUndefined();
  });

  it("groups board breakdowns by width and length and sorts dimensions", () => {
    const shapes = buildBoardShapes([
      { width: 6, length_ft: 8, thickness: "1", grade: "#3", total_pieces: 2, total_bd_ft: 8 },
      { width: 4, length_ft: 6, thickness: "5/8", grade: "#2", total_pieces: 3, total_bd_ft: 5 },
      { width: 4, length_ft: 6, thickness: "5/8", grade: "#3", total_pieces: 1, total_bd_ft: 2 },
      { width: null, length_ft: 6, total_pieces: 99, total_bd_ft: 99 },
    ]);
    expect(shapes).toHaveLength(2);
    expect(shapes[0]).toMatchObject({ width: 4, lengthFt: 6, pieces: 4, boardFeet: 7 });
    expect(shapes[0].percentage).toBeCloseTo(4 / 6 * 100);
    expect(shapes[0].breakdown).toHaveLength(2);
  });

  it("combines grades and thicknesses into width/length products and calculates piece percentages", () => {
    const rows = [
      { thickness: "3/4", width: 4, length_ft: 8, grade: "#2", total_pieces: 150, total_bd_ft: 300 },
      { thickness: "1", width: 4, length_ft: 8, grade: "#3", total_pieces: 50, total_bd_ft: 100 },
      { thickness: "1", width: 5, length_ft: 10, grade: "#2", total_pieces: 800, total_bd_ft: 1200 },
    ];
    const ascending = buildProductBreakdown(rows, "ascending");
    expect(ascending).toHaveLength(2);
    expect(ascending[0]).toMatchObject({ product: "4 in × 8 ft", pieces: 200, boardFeet: 400, percentage: 20 });
    expect(buildProductBreakdown(rows, "descending").map((row) => row.width)).toEqual([5, 4]);
    expect(buildProductBreakdown(rows, "most-pieces").map((row) => row.pieces)).toEqual([800, 200]);
    expect(buildProductBreakdown(rows, "least-pieces").map((row) => row.pieces)).toEqual([200, 800]);
  });

  it("sorts mix chart dimensions and grades into natural ascending order", () => {
    const widthRows = [7.5, 5.5, 3.5, 5].map((width) => ({ width, total_pieces: 1, total_bd_ft: 1 }));
    expect(sortMixRows(widthRows, "width").map((row) => row.width)).toEqual([3.5, 5, 5.5, 7.5]);

    const gradeRows = ["PLT", "#3", "#2"].map((grade) => ({ grade, total_pieces: 1, total_bd_ft: 1 }));
    expect(sortMixRows(gradeRows, "grade").map((row) => row.grade)).toEqual(["#2", "#3", "PLT"]);

    const thicknessRows = ["1 1/2", "3/4", "5/8", "1"].map((thickness) => ({ thickness, total_pieces: 1, total_bd_ft: 1 }));
    expect(sortMixRows(thicknessRows, "thickness").map((row) => row.thickness)).toEqual(["5/8", "3/4", "1", "1 1/2"]);
  });

  it.each([
    [50, 50, 64, 40, 300, 200, { x: 64, y: 64 }],
    [290, 50, 64, 40, 300, 200, { x: 212, y: 64 }],
    [50, 190, 64, 40, 300, 200, { x: 64, y: 136 }],
    [2, 2, 64, 40, 300, 200, { x: 16, y: 16 }],
  ])("keeps tooltips within the viewport", (x, y, width, height, viewportWidth, viewportHeight, expected) => {
    expect(tooltipCoordinates(x, y, width, height, viewportWidth, viewportHeight)).toEqual(expected);
  });
});
