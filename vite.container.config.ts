import { defineConfig, mergeConfig, type ConfigEnv, type UserConfig } from "vite";

import baseConfig from "./vite.config";

export default defineConfig(async (env: ConfigEnv) => {
  const resolvedBase =
    typeof baseConfig === "function" ? await baseConfig(env) : baseConfig;

  return mergeConfig(resolvedBase as UserConfig, {
    // Vite optimizes dependencies while the server runs. TrueNAS may use an
    // arbitrary UID with read-only access to /app, while /tmp is writable.
    cacheDir: "/tmp/lumber-tally-dashboard-vite",
  });
});
