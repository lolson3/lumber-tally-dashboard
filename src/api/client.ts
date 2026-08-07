import type {
  DateRange,
  FileDetail,
  FileOut,
  GradeMixRow,
  GradeMixGrouping,
  HealthResponse,
  ProductionSummaryRow,
  RecoveryRow,
  RejectReasonTotalOut,
  SolutionTotalOut,
  SummaryOut,
} from "./types";

const API_ROOT = "/api/bronze";
const PAGE_LIMIT = 1000;
const DATASET_TTL_MS = 60_000;

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export class NetworkError extends Error {
  constructor(message = "Unable to reach the Tally API. Check the network connection and try again.") {
    super(message);
    this.name = "NetworkError";
  }
}

export class ResponseFormatError extends Error {
  constructor() {
    super("The Tally API returned an invalid JSON response.");
    this.name = "ResponseFormatError";
  }
}

interface BronzeRow<T> { payload: T }
interface BronzePage<T> { rows: Array<BronzeRow<T>>; count: number; offset: number }
interface BronzeTablesResponse {
  tables: Array<{ table_name: string; row_count: number }>;
}
interface FilePayload extends FileOut { _rowid?: number; loaded_at?: string }
interface SummaryPayload extends SummaryOut { file_id: number }
interface SolutionPayload { file_id: number; solution_number: number; board_count: number }
interface RejectPayload { file_id: number; reason: string; count: number }
interface DetailPayload {
  file_id: number;
  wood_type: string;
  thickness: string;
  width: number;
  grade: string;
  length_ft: number;
  pieces: number;
  bd_ft: number;
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_ROOT}${path}`, {
      headers: { Accept: "application/json" },
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new NetworkError();
  }

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { detail?: unknown };
      detail = typeof body.detail === "string" ? `: ${body.detail}` : "";
    } catch {
      // The status code remains useful when the server does not return JSON.
    }
    throw new ApiError(`API request failed (${response.status})${detail}`, response.status);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ResponseFormatError();
  }
}

let tableCountsPromise: Promise<Map<string, number>> | null = null;

function loadTableCounts(): Promise<Map<string, number>> {
  if (!tableCountsPromise) {
    tableCountsPromise = request<BronzeTablesResponse>("/tables")
      .then(({ tables }) => new Map(tables.map((table) => [table.table_name, table.row_count])))
      .catch((error) => {
        tableCountsPromise = null;
        throw error;
      });
  }
  return tableCountsPromise;
}

async function fetchTable<T>(table: string): Promise<T[]> {
  const counts = await loadTableCounts();
  const tableName = `tally__${table.replaceAll("-", "_")}`;
  const rowCount = counts.get(tableName);
  if (typeof rowCount !== "number") throw new ResponseFormatError();

  const offsets = Array.from(
    { length: Math.ceil(rowCount / PAGE_LIMIT) },
    (_, page) => page * PAGE_LIMIT,
  );
  const pages = await Promise.all(offsets.map((offset) =>
    request<BronzePage<T>>(`/tally/${table}?limit=${PAGE_LIMIT}&offset=${offset}`),
  ));
  if (pages.some((page) => !Array.isArray(page.rows))) throw new ResponseFormatError();
  return pages.flatMap((page) => page.rows.map((row) => row.payload));
}

const tableCache = new Map<string, { loadedAt: number; promise: Promise<unknown[]> }>();

export function resetTallyApiCache() {
  tableCountsPromise = null;
  tableCache.clear();
}

function loadTable<T>(table: string): Promise<T[]> {
  const cached = tableCache.get(table);
  if (cached && Date.now() - cached.loadedAt <= DATASET_TTL_MS) {
    return cached.promise as Promise<T[]>;
  }
  const entry = { loadedAt: Date.now(), promise: fetchTable<T>(table) as Promise<unknown[]> };
  tableCache.set(table, entry);
  entry.promise.catch(() => {
    if (tableCache.get(table) === entry) tableCache.delete(table);
  });
  return entry.promise as Promise<T[]>;
}

function fileIdsInRange(files: FilePayload[], range: DateRange): Set<number> {
  return new Set(files.filter((file) => {
    const date = file.report_datetime.slice(0, 10);
    return (!range.start || date >= range.start) && (!range.end || date <= range.end);
  }).map((file) => file.file_id));
}

async function loadRangedTable<T extends { file_id: number }>(table: string, range: DateRange) {
  const [files, rows] = await Promise.all([
    loadTable<FilePayload>("files"),
    loadTable<T>(table),
  ]);
  const fileIds = fileIdsInRange(files, range);
  return { files, rows: rows.filter((row) => fileIds.has(row.file_id)) };
}

function aggregate<K extends string | number>(
  rows: Array<{ key: K; pieces: number; bdFt: number }>,
): Array<{ key: K; pieces: number; bdFt: number }> {
  const totals = new Map<K, { pieces: number; bdFt: number }>();
  for (const row of rows) {
    const current = totals.get(row.key) ?? { pieces: 0, bdFt: 0 };
    current.pieces += row.pieces;
    current.bdFt += row.bdFt;
    totals.set(row.key, current);
  }
  return [...totals].map(([key, value]) => ({ key, ...value }));
}

function groupDetails(rows: DetailPayload[], groupBy: GradeMixGrouping): GradeMixRow[] {
  return aggregate(rows.map((row) => ({
    key: row[groupBy] ?? "",
    pieces: row.pieces ?? 0,
    bdFt: row.bd_ft ?? 0,
  }))).map(({ key, pieces, bdFt }) => ({
    [groupBy]: key,
    total_pieces: pieces,
    total_bd_ft: bdFt,
  }));
}

export const tallyApi = {
  health: async (_signal?: AbortSignal): Promise<HealthResponse> => {
    await loadTableCounts();
    return { status: "ok" };
  },

  files: async (range: DateRange, _signal?: AbortSignal): Promise<FileOut[]> => {
    const files = await loadTable<FilePayload>("files");
    const ids = fileIdsInRange(files, range);
    return files.filter((file) => ids.has(file.file_id));
  },

  file: async (fileId: number, _signal?: AbortSignal): Promise<FileDetail> => {
    const [files, summaries, solutions, rejects, details] = await Promise.all([
      loadTable<FilePayload>("files"), loadTable<SummaryPayload>("summary"),
      loadTable<SolutionPayload>("solutions"), loadTable<RejectPayload>("reject-reasons"),
      loadTable<DetailPayload>("detail-lines"),
    ]);
    const file = files.find((row) => row.file_id === fileId);
    if (!file) throw new ApiError(`Report file ${fileId} was not found.`, 404);
    return {
      ...file,
      summary: summaries.find((row) => row.file_id === fileId) ?? null,
      solutions: solutions.filter((row) => row.file_id === fileId)
        .map(({ solution_number, board_count }) => ({ solution_number, board_count }))
        .sort((a, b) => a.solution_number - b.solution_number),
      reject_reasons: rejects.filter((row) => row.file_id === fileId)
        .map(({ reason, count }) => ({ reason, count })),
      detail_lines: details.filter((row) => row.file_id === fileId)
        .map(({ wood_type, thickness, width, grade, length_ft, pieces, bd_ft }) => ({
          wood_type, thickness, width, grade, length_ft, pieces, bd_ft,
        })),
    };
  },

  productionSummary: async (range: DateRange, _signal?: AbortSignal): Promise<ProductionSummaryRow[]> => {
    const { files: fileRows, rows } = await loadRangedTable<SummaryPayload>("summary", range);
    const files = new Map(fileRows.map((file) => [file.file_id, file]));
    return rows.map((row) => ({
      ...row,
      filename: files.get(row.file_id)?.filename ?? "",
      report_datetime: files.get(row.file_id)?.report_datetime ?? "",
    }));
  },

  recovery: async (range: DateRange, _signal?: AbortSignal): Promise<RecoveryRow[]> => {
    const { files: fileRows, rows } = await loadRangedTable<SummaryPayload>("summary", range);
    const files = new Map(fileRows.map((file) => [file.file_id, file]));
    return rows.map((row) => ({
      file_id: row.file_id,
      report_datetime: files.get(row.file_id)?.report_datetime ?? "",
      recovery_lrf_bf_cm: row.recovery_lrf_bf_cm,
      recovery_bf_cf: row.recovery_bf_cf,
      fiber_ratio: row.fiber_ratio,
    }));
  },

  solutionTotals: async (range: DateRange, _signal?: AbortSignal): Promise<SolutionTotalOut[]> => {
    const { rows } = await loadRangedTable<SolutionPayload>("solutions", range);
    return aggregate(rows.map((row) => ({
      key: row.solution_number, pieces: row.board_count, bdFt: 0,
    }))).map(({ key, pieces }) => ({ solution_number: key, total_board_count: pieces }))
      .sort((a, b) => a.solution_number - b.solution_number);
  },

  rejectReasonTotals: async (range: DateRange, _signal?: AbortSignal): Promise<RejectReasonTotalOut[]> => {
    const { rows } = await loadRangedTable<RejectPayload>("reject-reasons", range);
    return aggregate(rows.map((row) => ({
      key: row.reason, pieces: row.count, bdFt: 0,
    }))).map(({ key, pieces }) => ({ reason: key, total_count: pieces }));
  },

  gradeMix: async (range: DateRange, groupBy: GradeMixGrouping, _signal?: AbortSignal) => {
    const { rows } = await loadRangedTable<DetailPayload>("detail-lines", range);
    return groupDetails(rows, groupBy);
  },

  boardDimensionMix: async (range: DateRange, _signal?: AbortSignal): Promise<GradeMixRow[]> => {
    const { rows } = await loadRangedTable<DetailPayload>("detail-lines", range);
    const totals = new Map<string, GradeMixRow>();
    for (const row of rows) {
      const key = `${row.width}|${row.length_ft}|${row.thickness}|${row.grade}`;
      const current = totals.get(key) ?? {
        width: row.width, length_ft: row.length_ft, thickness: row.thickness, grade: row.grade,
        total_pieces: 0, total_bd_ft: 0,
      };
      current.total_pieces += row.pieces ?? 0;
      current.total_bd_ft += row.bd_ft ?? 0;
      totals.set(key, current);
    }
    return [...totals.values()];
  },
};
