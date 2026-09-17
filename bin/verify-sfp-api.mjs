#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const PAGE_LIMIT = 1_000;
const REQUEST_TIMEOUT_MS = 30_000;

const contracts = {
  files: {
    route: "files",
    fields: {
      file_id: required("number"),
      filename: required("string"),
      filename_date: required("string"),
      report_datetime: required("string"),
    },
  },
  summary: {
    route: "summary",
    fields: {
      file_id: required("number"),
      time_start: optional("string", true),
      time_run: optional("string", true),
      time_no_production: optional("string", true),
      board_input_pieces: optional("number", true),
      board_input_cuft: optional("number", true),
      average_length_ft: optional("number", true),
      edger_bd_ft: optional("number", true),
      trim_pass_count: optional("number", true),
      trim_pass_bd_ft: optional("number", true),
      lumber_value: optional("number", true),
      lumber_value_deducts: optional("number", true),
      recovery_lrf_bf_cm: optional("number", true),
      recovery_bf_cf: optional("number", true),
      fiber_ratio: optional("number", true),
    },
  },
  solutions: {
    route: "solutions",
    fields: {
      file_id: required("number"),
      solution_number: required("number"),
      board_count: required("number"),
    },
  },
  reject_reasons: {
    route: "reject-reasons",
    fields: {
      file_id: required("number"),
      reason: required("string"),
      count: required("number"),
    },
  },
  detail_lines: {
    route: "detail-lines",
    fields: {
      file_id: required("number"),
      wood_type: required("string"),
      thickness: required("string"),
      width: required("number"),
      grade: required("string"),
      length_ft: required("number"),
      pieces: required("number"),
      bd_ft: required("number"),
    },
  },
};

function required(type, nullable = false) {
  return { type, nullable, required: true };
}

function optional(type, nullable = false) {
  return { type, nullable, required: false };
}

function fail(message) {
  throw new Error(message);
}

async function loadLocalEnvironment() {
  const values = {};
  for (const path of [".env", ".env.local", "docker/.env"]) {
    let text;
    try {
      text = await readFile(path, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator < 1) continue;
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      values[key] = value;
    }
  }
  return { ...values, ...process.env };
}

function configuredOrigin(environment) {
  const value = environment.TALLY_API_BASE_URL
    || environment.SFP_API_BASE_URL
    || environment.VITE_TALLY_API_BASE_URL
    || environment.VITE_SFP_API_BASE_URL;
  if (!value) {
    fail("No SFP API origin is configured. Set TALLY_API_BASE_URL or SFP_API_BASE_URL in the environment or an ignored .env file.");
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    fail("The configured SFP API origin is not a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    fail("The configured SFP API origin must use http:// or https://.");
  }
  return url.href.replace(/\/+$/, "");
}

async function requestJson(origin, path) {
  const startedAt = performance.now();
  let response;
  try {
    response = await fetch(`${origin}${path}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    fail(`GET ${path} could not reach the configured API (${error?.name || "network error"}).`);
  }
  const elapsedMs = performance.now() - startedAt;
  if (!response.ok) fail(`GET ${path} returned HTTP ${response.status}.`);
  try {
    return { value: await response.json(), elapsedMs };
  } catch {
    fail(`GET ${path} did not return valid JSON.`);
  }
}

function validateTableInventory(value) {
  if (!value || !Array.isArray(value.tables)) fail("/api/bronze/tables must return a tables array.");
  const counts = new Map();
  for (const [index, table] of value.tables.entries()) {
    if (!table || typeof table.table_name !== "string") fail(`tables[${index}].table_name must be a string.`);
    if (!Number.isInteger(table.row_count) || table.row_count < 0) {
      fail(`tables[${index}].row_count must be a non-negative integer.`);
    }
    if (counts.has(table.table_name)) fail(`The table inventory contains duplicate ${table.table_name} entries.`);
    counts.set(table.table_name, table.row_count);
  }
  for (const name of Object.keys(contracts)) {
    const tableName = `tally__${name}`;
    if (!counts.has(tableName)) fail(`The required ${tableName} table is missing from the inventory.`);
  }
  return counts;
}

function observationMap(contract) {
  return new Map(Object.keys(contract.fields).map((field) => [field, {
    missing: 0,
    nulls: 0,
    types: new Set(),
  }]));
}

function normalizePayload(payload) {
  if (payload && typeof payload === "object" && typeof payload.file_id !== "number" && typeof payload.File_id === "number") {
    return { ...payload, file_id: payload.File_id };
  }
  return payload;
}

function validatePayload(resourceName, payload, rowIndex, observations) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    fail(`${resourceName} row ${rowIndex} payload must be an object.`);
  }
  const normalized = normalizePayload(payload);
  const contract = contracts[resourceName];
  for (const [field, rule] of Object.entries(contract.fields)) {
    const observation = observations.get(field);
    if (!(field in normalized) || normalized[field] === undefined) {
      observation.missing += 1;
      if (rule.required) fail(`${resourceName} row ${rowIndex}.${field} is required.`);
      continue;
    }
    const value = normalized[field];
    if (value === null) {
      observation.nulls += 1;
      if (!rule.nullable) fail(`${resourceName} row ${rowIndex}.${field} cannot be null.`);
      continue;
    }
    const type = typeof value;
    observation.types.add(type);
    if (type !== rule.type || (type === "number" && !Number.isFinite(value))) {
      fail(`${resourceName} row ${rowIndex}.${field} must be ${rule.type}${rule.nullable ? " or null" : ""}; received ${type}.`);
    }
  }
  return normalized;
}

function validatePage(resourceName, value, expectedOffset, observations) {
  const expectedTable = `tally__${resourceName}`;
  if (!value || value.table !== expectedTable || !Array.isArray(value.rows)) {
    fail(`${resourceName} must return table=${expectedTable} and a rows array.`);
  }
  if (value.count !== undefined && value.count !== value.rows.length) {
    fail(`${resourceName} page count does not match rows.length.`);
  }
  if (value.offset !== undefined && value.offset !== expectedOffset) {
    fail(`${resourceName} page reported offset ${value.offset}; expected ${expectedOffset}.`);
  }
  return value.rows.map((row, index) => {
    if (!row || typeof row !== "object" || !("payload" in row)) {
      fail(`${resourceName} row ${expectedOffset + index} must contain payload.`);
    }
    return validatePayload(resourceName, row.payload, expectedOffset + index, observations);
  });
}

async function loadResource(origin, resourceName, advertisedCount) {
  const contract = contracts[resourceName];
  const observations = observationMap(contract);
  const startedAt = performance.now();
  const firstPath = `/api/bronze/tally/${contract.route}?limit=${PAGE_LIMIT}&offset=0`;
  const first = await requestJson(origin, firstPath);
  const firstRows = validatePage(resourceName, first.value, 0, observations);
  if (advertisedCount > 0 && firstRows.length === 0) {
    fail(`${resourceName} advertises ${advertisedCount} rows but returned an empty first page.`);
  }

  const effectivePageSize = firstRows.length || PAGE_LIMIT;
  const offsets = Array.from(
    { length: Math.max(0, Math.ceil((advertisedCount - firstRows.length) / effectivePageSize)) },
    (_, index) => effectivePageSize * (index + 1),
  );
  const remaining = await Promise.all(offsets.map(async (offset) => {
    const result = await requestJson(origin, `/api/bronze/tally/${contract.route}?limit=${PAGE_LIMIT}&offset=${offset}`);
    return validatePage(resourceName, result.value, offset, observations);
  }));
  const rows = [firstRows, ...remaining].flat();
  if (rows.length !== advertisedCount) {
    fail(`${resourceName} loaded ${rows.length} rows but /tables advertised ${advertisedCount}.`);
  }
  return {
    rows,
    pages: 1 + offsets.length,
    elapsedMs: performance.now() - startedAt,
    observations,
  };
}

function sum(rows, field) {
  return rows.reduce((total, row) => total + (typeof row[field] === "number" ? row[field] : 0), 0);
}

function aggregate(rows, keyField, valueField) {
  const totals = new Map();
  for (const row of rows) {
    totals.set(row[keyField], (totals.get(row[keyField]) || 0) + row[valueField]);
  }
  return totals;
}

function sameNumber(actual, expected, label) {
  if (Math.abs(actual - expected) > 1e-9) fail(`${label} dashboard/source totals do not match.`);
}

function validateDashboardParity(resources) {
  const filesById = new Map(resources.files.rows.map((file) => [file.file_id, file]));
  if (filesById.size !== resources.files.rows.length) fail("files contains duplicate file_id values.");

  for (const resourceName of ["summary", "solutions", "reject_reasons", "detail_lines"]) {
    const orphan = resources[resourceName].rows.find((row) => !filesById.has(row.file_id));
    if (orphan) fail(`${resourceName} references unknown file_id ${orphan.file_id}.`);
  }

  const comparisons = [];
  const productionFields = [
    "board_input_pieces", "board_input_cuft", "edger_bd_ft", "trim_pass_count",
    "trim_pass_bd_ft", "lumber_value", "lumber_value_deducts",
  ];
  const dashboardProduction = resources.summary.rows.map((row) => ({
    ...row,
    filename: filesById.get(row.file_id)?.filename || "",
    report_datetime: filesById.get(row.file_id)?.report_datetime || "",
  }));
  for (const field of productionFields) {
    sameNumber(sum(dashboardProduction, field), sum(resources.summary.rows, field), `production.${field}`);
    comparisons.push(`production.${field}`);
  }

  const solutionGroups = aggregate(resources.solutions.rows, "solution_number", "board_count");
  sameNumber([...solutionGroups.values()].reduce((total, value) => total + value, 0), sum(resources.solutions.rows, "board_count"), "solutions.board_count");
  comparisons.push("solutions.board_count");

  const rejectGroups = aggregate(resources.reject_reasons.rows, "reason", "count");
  sameNumber([...rejectGroups.values()].reduce((total, value) => total + value, 0), sum(resources.reject_reasons.rows, "count"), "rejects.count");
  comparisons.push("rejects.count");

  const gradePieces = aggregate(resources.detail_lines.rows, "grade", "pieces");
  const gradeBoardFeet = aggregate(resources.detail_lines.rows, "grade", "bd_ft");
  sameNumber([...gradePieces.values()].reduce((total, value) => total + value, 0), sum(resources.detail_lines.rows, "pieces"), "gradeMix.pieces");
  sameNumber([...gradeBoardFeet.values()].reduce((total, value) => total + value, 0), sum(resources.detail_lines.rows, "bd_ft"), "gradeMix.bd_ft");
  comparisons.push("gradeMix.pieces", "gradeMix.bd_ft");

  return comparisons;
}

function printObservations(resourceName, result) {
  const fields = [...result.observations.entries()].map(([field, observation]) => {
    const types = [...observation.types].sort().join("|") || "none observed";
    return `${field}=${types}; null=${observation.nulls}; missing=${observation.missing}`;
  });
  console.log(`  ${resourceName}: ${fields.join(", ")}`);
}

async function main() {
  const environment = await loadLocalEnvironment();
  const origin = configuredOrigin(environment);
  console.log("SFP live contract verification");
  console.log("Origin: configured (value intentionally hidden)");

  const inventory = await requestJson(origin, "/api/bronze/tables");
  const counts = validateTableInventory(inventory.value);
  const fullLoadStartedAt = performance.now();
  const entries = await Promise.all(Object.keys(contracts).map(async (resourceName) => {
    const result = await loadResource(origin, resourceName, counts.get(`tally__${resourceName}`));
    return [resourceName, result];
  }));
  const resources = Object.fromEntries(entries);
  const fullLoadMs = performance.now() - fullLoadStartedAt;
  const comparisons = validateDashboardParity(resources);

  console.log("\nEndpoint and pagination results:");
  console.log(`  tables: ${counts.size} tables (${inventory.elapsedMs.toFixed(1)} ms)`);
  for (const [resourceName, result] of entries) {
    console.log(`  ${resourceName}: ${result.rows.length} rows, ${result.pages} page(s), ${result.elapsedMs.toFixed(1)} ms`);
  }
  console.log(`  concurrent full load: ${fullLoadMs.toFixed(1)} ms`);

  console.log("\nObserved field types/nullability:");
  for (const [resourceName, result] of entries) printObservations(resourceName, result);

  console.log(`\nDashboard/source comparisons: ${comparisons.length}/${comparisons.length} passed`);
  console.log("Cross-table file_id references: passed");
  console.log("SFP live contract: PASS");
}

main().catch((error) => {
  console.error(`SFP live contract: FAIL\n${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
