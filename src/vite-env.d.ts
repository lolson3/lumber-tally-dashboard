/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MILL_ID?: "sequoia" | "north-fork";
  readonly VITE_TALLY_API_BASE_URL?: string;
  readonly VITE_SFP_API_BASE_URL?: string;
  readonly VITE_NFL_API_BASE_URL?: string;
}
