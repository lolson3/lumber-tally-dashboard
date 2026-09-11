import { describe, expect, it } from "vitest";
import { demoMockTables } from "../api/mockDemoData";

describe("demo data", () => {
  it("contains 90 consecutive calendar days ending today", () => {
    const dates = demoMockTables.files.map((file) => file.filename_date);
    const today = new Date();
    const expectedEnd = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");

    expect(dates).toHaveLength(90);
    expect(dates.at(-1)).toBe(expectedEnd);
    dates.slice(1).forEach((date, index) => {
      const previous = new Date(`${dates[index]}T12:00:00Z`);
      previous.setUTCDate(previous.getUTCDate() + 1);
      expect(date).toBe(previous.toISOString().slice(0, 10));
    });
  });

  it("does not correlate product-size order with piece-count order", () => {
    const totals = new Map<string, { width: number; length: number; pieces: number }>();
    for (const row of demoMockTables.detail_lines) {
      const key = `${row.width}x${row.length_ft}`;
      const total = totals.get(key) ?? { width: row.width, length: row.length_ft, pieces: 0 };
      total.pieces += row.pieces;
      totals.set(key, total);
    }
    const products = [...totals.entries()];
    const bySize = [...products].sort(([, left], [, right]) => left.width - right.width || left.length - right.length).map(([key]) => key);
    const byPieces = [...products].sort(([, left], [, right]) => right.pieces - left.pieces).map(([key]) => key);

    expect(byPieces).not.toEqual(bySize);
  });
});
