import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { getMillProfile } from "./src/config/mills";

function manifestForMill(mill: ReturnType<typeof getMillProfile>) {
  return JSON.stringify({
    id: "/",
    name: mill.dashboardName,
    short_name: mill.shortName,
    description: mill.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    orientation: "any",
    background_color: mill.theme.background,
    theme_color: mill.theme.themeColor,
    categories: ["business", "productivity", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }, null, 2);
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const demoMode = mode === "demo";
  const isolatedTestMode = mode === "test" || mode === "e2e";
  const mill = getMillProfile(isolatedTestMode ? "sequoia" : env.VITE_MILL_ID);
  const millManifest = manifestForMill(mill);
  const apiTarget = env.VITE_TALLY_API_BASE_URL || (mill.api.originEnv ? env[mill.api.originEnv] : "") || mill.api.defaultOrigin;
  const dashboardPort = Number(env.VITE_DASHBOARD_PORT || "5173");
  if (!Number.isInteger(dashboardPort) || dashboardPort < 1 || dashboardPort > 65_535) {
    throw new Error("VITE_DASHBOARD_PORT must be an integer between 1 and 65535.");
  }
  const allowedHosts = (env.VITE_ALLOWED_HOSTS || "tally.biztechro.com")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);
  // Demo mode must not even expose a proxy capable of reaching a real service.
  const proxy = demoMode || mill.api.adapter === "mock" ? undefined : {
    "/api": {
      target: apiTarget,
      changeOrigin: true,
    },
  };

  return {
    define: {
      // Adapter unit tests target the production bronze contract regardless of
      // which branded view is selected in the local .env file.
      ...(isolatedTestMode ? { "import.meta.env.VITE_MILL_ID": JSON.stringify("sequoia") } : {}),
      "import.meta.env.VITE_DEMO_MODE": JSON.stringify(demoMode ? "true" : "false"),
      "import.meta.env.VITE_FAKE_DATA_SEED": JSON.stringify(env.FAKE_DATA_SEED || "demo-seed-v1"),
    },
    plugins: [react(), {
      name: "mill-profile",
      configureServer(server) {
        server.middlewares.use("/manifest.webmanifest", (_, response) => {
          response.setHeader("Content-Type", "application/manifest+json");
          response.end(millManifest);
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use("/manifest.webmanifest", (_, response) => {
          response.setHeader("Content-Type", "application/manifest+json");
          response.end(millManifest);
        });
      },
      generateBundle() {
        this.emitFile({ type: "asset", fileName: "manifest.webmanifest", source: millManifest });
      },
    }],
    server: { port: dashboardPort, strictPort: true, allowedHosts, ...(proxy ? { proxy } : {}) },
    preview: { port: dashboardPort, strictPort: true, allowedHosts, ...(proxy ? { proxy } : {}) },
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      css: true,
    },
  };
});
