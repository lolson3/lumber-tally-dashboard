import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_TALLY_API_BASE_URL || "http://192.168.203.229:7304";
  const dashboardPort = Number(env.VITE_DASHBOARD_PORT || "5173");
  if (!Number.isInteger(dashboardPort) || dashboardPort < 1 || dashboardPort > 65_535) {
    throw new Error("VITE_DASHBOARD_PORT must be an integer between 1 and 65535.");
  }
  const proxy = {
    "/api": {
      target: apiTarget,
      changeOrigin: true,
    },
  };

  return {
    plugins: [react()],
    server: { port: dashboardPort, strictPort: true, proxy },
    preview: { port: dashboardPort, strictPort: true, proxy },
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      css: true,
    },
  };
});
