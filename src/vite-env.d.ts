/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MILL_ID?: "sequoia" | "north-fork" | "agwood" | "cascade";
  readonly VITE_DEMO_MODE?: "true" | "false";
  readonly VITE_FAKE_DATA_SEED?: string;
  readonly VITE_TALLY_API_BASE_URL?: string;
  readonly VITE_SFP_API_BASE_URL?: string;
  readonly VITE_NFL_API_BASE_URL?: string;
}

interface Window {
  __LUMBER_TALLY_CONFIG__?: {
    millId?: "sequoia" | "north-fork" | "agwood" | "cascade";
    demoMode?: boolean;
    fakeDataSeed?: string;
  };
}
