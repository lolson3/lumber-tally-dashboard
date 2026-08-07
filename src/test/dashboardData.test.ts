import { describe, expect, it } from "vitest";
import { buildBoardShapes, mergeProductionRecovery, sortMixRows, sumNullable } from "../utils/dashboardData";
import { tooltipCoordinates } from "../utils/tooltipPosition";

describe("dashboard calculations", () => {
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
    expect(shapes[0]).toMatchObject({ width: 4, lengthFt: 6 });
    expect(shapes[0].breakdown).toHaveLength(2);
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
