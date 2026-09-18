import assert from "node:assert/strict";
import { after, test } from "node:test";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { prepareNativeRuntime } from "./prepare-native-runtime.mjs";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const temporaryRoots = [];

after(() => {
  for (const root of temporaryRoots) rmSync(root, { recursive: true, force: true });
});

function fixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), "lumber-tally-native-runtime-"));
  temporaryRoots.push(root);
  mkdirSync(join(root, "dist", "manifests"), { recursive: true });
  mkdirSync(join(root, "docker"), { recursive: true });
  copyFileSync(
    join(repositoryRoot, "docker", "nginx.conf.template"),
    join(root, "docker", "nginx.conf.template"),
  );
  writeFileSync(join(root, "dist", "manifests", "sequoia.webmanifest"), "{\"name\":\"Test\"}\n");
  return root;
}

test("prepares a Sequoia native nginx runtime", () => {
  const projectRoot = fixtureRoot();
  const runtimeDirectory = join(projectRoot, ".runtime", "nginx");
  const result = prepareNativeRuntime({
    environment: {
      MILL_ID: "sequoia",
      DEMO_MODE: "false",
      TALLY_API_BASE_URL: "http://127.0.0.1:7304/",
      DASHBOARD_PORT: "8080",
      FAKE_DATA_SEED: "test-seed",
    },
    projectRoot,
    runtimeDirectory,
    mimeTypesPath: "/etc/nginx/mime.types",
  });

  assert.equal(result.apiBase, "http://127.0.0.1:7304");
  assert.equal(
    readFileSync(join(projectRoot, "dist", "runtime-config.js"), "utf8"),
    'window.__LUMBER_TALLY_CONFIG__ = {"millId":"sequoia","demoMode":false,"fakeDataSeed":"test-seed"};\n',
  );
  assert.equal(
    readFileSync(join(projectRoot, "dist", "manifest.webmanifest"), "utf8"),
    "{\"name\":\"Test\"}\n",
  );
  const nginxConfiguration = readFileSync(result.configurationPath, "utf8");
  assert.match(nginxConfiguration, /listen 8080;/);
  assert.match(nginxConfiguration, /proxy_pass http:\/\/127\.0\.0\.1:7304;/);
  assert.match(nginxConfiguration, /api\/bronze\/tables/);
  assert.doesNotMatch(nginxConfiguration, /\$\{[A-Z0-9_]+\}/);
});

test("rejects a production profile without an API origin", () => {
  const projectRoot = fixtureRoot();
  assert.throws(
    () => prepareNativeRuntime({
      environment: { MILL_ID: "sequoia", DEMO_MODE: "false" },
      projectRoot,
      runtimeDirectory: join(projectRoot, ".runtime", "nginx"),
      mimeTypesPath: "/etc/nginx/mime.types",
    }),
    /TALLY_API_BASE_URL is required/,
  );
});
