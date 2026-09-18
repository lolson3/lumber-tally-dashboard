import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const supportedMills = new Set(["sequoia", "north-fork", "agwood", "cascade"]);

function requiredArgument(argumentsByName, name) {
  const value = argumentsByName.get(name);
  if (!value) throw new Error(`Missing required argument --${name}.`);
  return resolve(value);
}

function parseArguments(argv) {
  if (argv.length % 2 !== 0) throw new Error("Arguments must be supplied as --name value pairs.");
  const parsed = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    if (!name.startsWith("--")) throw new Error(`Unexpected argument '${name}'.`);
    parsed.set(name.slice(2), argv[index + 1]);
  }
  return parsed;
}

function parseBoolean(name, value, fallback) {
  if (value === undefined || value === "") return fallback;
  if (/^(true|1|yes)$/i.test(value)) return true;
  if (/^(false|0|no)$/i.test(value)) return false;
  throw new Error(`${name} must be true or false.`);
}

function normalizedApiBase(environment, millId, demoMode) {
  let apiBase = environment.TALLY_API_BASE_URL || environment.VITE_TALLY_API_BASE_URL || "";
  if (!apiBase && millId === "sequoia") {
    apiBase = environment.SFP_API_BASE_URL || environment.VITE_SFP_API_BASE_URL || "";
  }
  if (!apiBase && millId === "north-fork") {
    apiBase = environment.NFL_API_BASE_URL || environment.VITE_NFL_API_BASE_URL || "";
  }
  if (!demoMode && (millId === "sequoia" || millId === "north-fork") && !apiBase) {
    throw new Error("TALLY_API_BASE_URL is required for a non-demo production profile.");
  }

  apiBase = apiBase.replace(/\/+$/, "") || "http://127.0.0.1:9";
  let parsed;
  try {
    parsed = new URL(apiBase);
  } catch {
    throw new Error("TALLY_API_BASE_URL must be a valid http:// or https:// URL.");
  }
  if (!(["http:", "https:"].includes(parsed.protocol)) || parsed.username || parsed.password) {
    throw new Error("TALLY_API_BASE_URL must be an http:// or https:// URL without credentials.");
  }
  if (/[\s;{}$]/.test(apiBase)) {
    throw new Error("TALLY_API_BASE_URL contains characters that are unsafe in an nginx configuration.");
  }
  return apiBase;
}

function nginxPath(path) {
  return path.replaceAll("\\", "/").replaceAll('"', '\\"');
}

function quotedPath(path) {
  return `"${nginxPath(path)}"`;
}

export function prepareNativeRuntime({ environment, projectRoot, runtimeDirectory, mimeTypesPath }) {
  const dashboardPort = Number(environment.DASHBOARD_PORT || "8080");
  if (!Number.isInteger(dashboardPort) || dashboardPort < 1024 || dashboardPort > 65_535) {
    throw new Error("DASHBOARD_PORT must be an integer between 1024 and 65535.");
  }

  const millId = environment.MILL_ID || environment.VITE_MILL_ID || "cascade";
  if (!supportedMills.has(millId)) {
    throw new Error("MILL_ID must be sequoia, north-fork, agwood, or cascade.");
  }
  const demoMode = parseBoolean("DEMO_MODE", environment.DEMO_MODE, false);
  const fakeDataSeed = environment.FAKE_DATA_SEED || "demo-seed-v1";
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(fakeDataSeed)) {
    throw new Error("FAKE_DATA_SEED must contain 1-128 letters, numbers, dots, underscores, or hyphens.");
  }

  const htmlRoot = join(projectRoot, "dist");
  const apiBase = normalizedApiBase(environment, millId, demoMode);
  const healthTarget = demoMode || millId === "agwood" || millId === "cascade"
    ? `http://127.0.0.1:${dashboardPort}/healthz`
    : millId === "sequoia"
      ? `${apiBase}/api/bronze/tables`
      : `${apiBase}/health`;

  mkdirSync(runtimeDirectory, { recursive: true });
  for (const directory of ["client_temp", "proxy_temp", "fastcgi_temp", "uwsgi_temp", "scgi_temp"]) {
    mkdirSync(join(runtimeDirectory, directory), { recursive: true });
  }

  copyFileSync(
    join(htmlRoot, "manifests", `${millId}.webmanifest`),
    join(htmlRoot, "manifest.webmanifest"),
  );
  writeFileSync(
    join(htmlRoot, "runtime-config.js"),
    `window.__LUMBER_TALLY_CONFIG__ = ${JSON.stringify({ millId, demoMode, fakeDataSeed })};\n`,
  );

  const substitutions = new Map([
    ["${DASHBOARD_PORT}", String(dashboardPort)],
    ["${DASHBOARD_HTML_ROOT}", nginxPath(htmlRoot)],
    ["${DASHBOARD_HEALTH_TARGET}", healthTarget],
    ["${TALLY_API_BASE_URL}", apiBase],
  ]);
  let serverConfiguration = readFileSync(join(projectRoot, "docker", "nginx.conf.template"), "utf8");
  for (const [placeholder, value] of substitutions) {
    serverConfiguration = serverConfiguration.replaceAll(placeholder, value);
  }
  const unresolved = serverConfiguration.match(/\$\{[A-Z0-9_]+\}/g);
  if (unresolved) throw new Error(`Unresolved nginx template value: ${unresolved[0]}`);

  const mainConfiguration = `worker_processes auto;
pid ${quotedPath(join(runtimeDirectory, "nginx.pid"))};
error_log ${quotedPath(join(runtimeDirectory, "error.log"))} notice;

events {
    worker_connections 1024;
}

http {
    include ${quotedPath(mimeTypesPath)};
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log ${quotedPath(join(runtimeDirectory, "access.log"))} main;

    sendfile on;
    keepalive_timeout 65;
    server_tokens off;

    client_body_temp_path ${quotedPath(join(runtimeDirectory, "client_temp"))};
    proxy_temp_path       ${quotedPath(join(runtimeDirectory, "proxy_temp"))};
    fastcgi_temp_path     ${quotedPath(join(runtimeDirectory, "fastcgi_temp"))};
    uwsgi_temp_path       ${quotedPath(join(runtimeDirectory, "uwsgi_temp"))};
    scgi_temp_path        ${quotedPath(join(runtimeDirectory, "scgi_temp"))};

${serverConfiguration.split("\n").map((line) => `    ${line}`).join("\n")}
}
`;
  const configurationPath = join(runtimeDirectory, "nginx.conf");
  writeFileSync(configurationPath, mainConfiguration);
  return { configurationPath, dashboardPort, millId, apiBase };
}

function main() {
  const argumentsByName = parseArguments(process.argv.slice(2));
  const projectRoot = requiredArgument(argumentsByName, "project-root");
  const runtimeDirectory = requiredArgument(argumentsByName, "runtime-dir");
  const mimeTypesPath = requiredArgument(argumentsByName, "mime-types");
  if (!isAbsolute(projectRoot) || !isAbsolute(runtimeDirectory) || !isAbsolute(mimeTypesPath)) {
    throw new Error("Runtime paths must be absolute.");
  }
  const result = prepareNativeRuntime({
    environment: process.env,
    projectRoot,
    runtimeDirectory,
    mimeTypesPath,
  });
  process.stdout.write(`Prepared ${result.millId} production runtime on port ${result.dashboardPort}.\n`);
}

if (resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`ERROR: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
