import { afterEach, describe, expect, it, vi } from "vitest";
import { getMillProfile } from "../config/mills";

afterEach(() => {
  delete window.__LUMBER_TALLY_CONFIG__;
  vi.resetModules();
});

describe("mill configuration", () => {
  it("starts Agwood with all report dates while other mills retain the recent range", () => {
    expect(getMillProfile("agwood").initialReportRange).toBe("all");
    expect(getMillProfile("sequoia").initialReportRange).toBe("recent");
    expect(getMillProfile("north-fork").initialReportRange).toBe("recent");
  });

  it("prefers validated container runtime settings over build-time defaults", async () => {
    window.__LUMBER_TALLY_CONFIG__ = {
      millId: "north-fork",
      demoMode: true,
      fakeDataSeed: "runtime-test",
    };

    const [{ currentMill, demoMode }, { runtimeFakeDataSeed }] = await Promise.all([
      import("../config/currentMill"),
      import("../config/runtimeConfig"),
    ]);

    expect(currentMill.id).toBe("north-fork");
    expect(demoMode).toBe(true);
    expect(runtimeFakeDataSeed).toBe("runtime-test");
  });
});
