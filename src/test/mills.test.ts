import { describe, expect, it } from "vitest";
import { getMillProfile } from "../config/mills";

describe("mill configuration", () => {
  it("starts Agwood with all report dates while other mills retain the recent range", () => {
    expect(getMillProfile("agwood").initialReportRange).toBe("all");
    expect(getMillProfile("sequoia").initialReportRange).toBe("recent");
    expect(getMillProfile("north-fork").initialReportRange).toBe("recent");
  });
});
