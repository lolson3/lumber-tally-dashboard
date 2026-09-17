export interface DashboardRuntimeConfig {
  millId?: "sequoia" | "north-fork" | "agwood" | "cascade";
  demoMode?: boolean;
  fakeDataSeed?: string;
}

const runtimeConfig = globalThis.window?.__LUMBER_TALLY_CONFIG__;

export const runtimeMillId = runtimeConfig?.millId ?? import.meta.env.VITE_MILL_ID;
export const runtimeDemoMode = runtimeConfig?.demoMode ?? import.meta.env.VITE_DEMO_MODE === "true";
export const runtimeFakeDataSeed = runtimeConfig?.fakeDataSeed
  ?? import.meta.env.VITE_FAKE_DATA_SEED
  ?? "demo-seed-v1";
