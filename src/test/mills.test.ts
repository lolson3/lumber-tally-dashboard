import { afterEach, describe, expect, it, vi } from "vitest";
import { getMillProfile } from "../config/mills";

afterEach(() => {
  delete window.__LUMBER_TALLY_CONFIG__;
  vi.resetModules();
});

describe("mill configuration", () => {
  it("uses Cascade as the fictional default demo profile", () => {
    const cascade = getMillProfile("cascade");

    expect(getMillProfile(undefined).id).toBe("cascade");
    expect(cascade).toMatchObject({
      companyName: "Cascade Timber Works",
      initialReportRange: "all",
      logo: "/img/mtn-silhouette.png",
      api: { adapter: "mock" },
    });
    expect(cascade.theme.logoFilter).toBe("brightness(0) invert(1)");
  });

  it("starts mock profiles with all report dates while production profiles retain the recent range", () => {
    expect(getMillProfile("agwood").initialReportRange).toBe("all");
    expect(getMillProfile("cascade").initialReportRange).toBe("all");
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

  it("always identifies mock-only profiles as demo data", async () => {
    window.__LUMBER_TALLY_CONFIG__ = {
      millId: "cascade",
      demoMode: false,
    };

    const { currentMill, demoMode } = await import("../config/currentMill");

    expect(currentMill.id).toBe("cascade");
    expect(demoMode).toBe(true);
  });
});
