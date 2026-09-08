const nflLogo = new URL("../../img/nfl-logo-enhanced.png", import.meta.url).href;
const agwoodLogo = new URL("../../img/AML-logo-white.png", import.meta.url).href;

export const allPlcs = [
  "Board Edger", "Chopsaw", "Twin", "BakerInFeed", "Single", "Gang",
  "Swede", "Trimmer", "Debarker", "Baker", "Quad",
] as const;

export type PlcOption = (typeof allPlcs)[number];
export type MillId = "sequoia" | "north-fork" | "agwood";

export interface MillProfile {
  id: MillId;
  companyName: string;
  dashboardName: string;
  shortName: string;
  description: string;
  timeZone: string;
  api: {
    adapter: "sfp" | "nfl" | "mock";
    originEnv?: "VITE_SFP_API_BASE_URL" | "VITE_NFL_API_BASE_URL";
    defaultOrigin: string;
    documentation: string;
  };
  defaultPlc: PlcOption;
  initialReportRange: "recent" | "all";
  enabledPlcs: readonly PlcOption[];
  logo?: string;
  icons: {
    favicon: string;
    appleTouch: string;
  };
  theme: {
    primary: string;
    primarySoft: string;
    accent: string;
    metric: string;
    action: string;
    focus: string;
    sidebarText: string;
    themeColor: string;
    background: string;
  };
}

const sharedIcons = {
  favicon: "/img/woodcutting-favicon.png",
  appleTouch: "/icons/apple-touch-icon.png",
};

export const millProfiles: Record<MillId, MillProfile> = {
  sequoia: {
    id: "sequoia",
    companyName: "Sequoia Forest Products",
    dashboardName: "Lumber Tally Dashboard",
    shortName: "Lumber Tally",
    description: "Production dashboard for Sequoia Forest Products lumber tally reports.",
    timeZone: "America/Los_Angeles",
    api: {
      adapter: "sfp",
      originEnv: "VITE_SFP_API_BASE_URL",
      defaultOrigin: "http://127.0.0.1:7304",
      documentation: "/docs/SFP_API.md",
    },
    defaultPlc: "Board Edger",
    initialReportRange: "recent",
    enabledPlcs: ["Board Edger"],
    icons: sharedIcons,
    theme: { primary: "#dc5b08", primarySoft: "#ffe0cc", accent: "#f47700", metric: "#f47700", action: "#c84f00", focus: "#f47700", sidebarText: "#ffe1cc", themeColor: "#102a27", background: "#f4f0e6" },
  },
  "north-fork": {
    id: "north-fork",
    companyName: "North Fork Lumber",
    dashboardName: "Lumber Tally Dashboard",
    shortName: "Lumber Tally",
    description: "Production dashboard for North Fork Lumber tally reports.",
    timeZone: "America/Los_Angeles",
    api: {
      adapter: "nfl",
      originEnv: "VITE_NFL_API_BASE_URL",
      defaultOrigin: "http://127.0.0.1:7304",
      documentation: "/docs/NFL_API.md",
    },
    defaultPlc: "Board Edger",
    initialReportRange: "recent",
    enabledPlcs: ["Board Edger"],
    logo: nflLogo,
    icons: sharedIcons,
    theme: { primary: "#4d6fb7", primarySoft: "#dce5f7", accent: "#345795", metric: "#4d6fb7", action: "#4d6fb7", focus: "#4d6fb7", sidebarText: "#dce5f7", themeColor: "#17253f", background: "#f2f5fa" },
  },
  agwood: {
    id: "agwood",
    companyName: "Agwood Mill & Lumber",
    dashboardName: "Lumber Tally Dashboard",
    shortName: "Agwood Tally",
    description: "Production dashboard for Agwood Mill & Lumber tally reports.",
    timeZone: "America/Los_Angeles",
    api: {
      adapter: "mock",
      defaultOrigin: "",
      documentation: "",
    },
    defaultPlc: "Board Edger",
    initialReportRange: "all",
    enabledPlcs: ["Board Edger"],
    logo: agwoodLogo,
    icons: sharedIcons,
    theme: { primary: "#174f36", primarySoft: "#dcece3", accent: "#2f7d52", metric: "#4c956c", action: "#246b47", focus: "#2f7d52", sidebarText: "#e6f3eb", themeColor: "#174f36", background: "#f4f8f5" },
  },
};

export function getMillProfile(id: string | undefined) {
  const millId = id || "sequoia";
  if (!(millId in millProfiles)) throw new Error(`Unknown VITE_MILL_ID: ${millId}`);
  return millProfiles[millId as MillId];
}
