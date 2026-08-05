import type {
  DateRange,
  FileDetail,
  FileOut,
  GradeMixRow,
  HealthResponse,
  ProductionSummaryRow,
  RecoveryRow,
  RejectReasonTotalOut,
  SolutionTotalOut,
} from "./types";

const API_ROOT = (
  import.meta.env.VITE_TALLY_API_BASE_URL || "http://192.168.203.238:8800"
).replace(/\/$/, "");
const PAGE_LIMIT = 5000;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function paramsFor(range: DateRange, extra: Record<string, string> = {}) {
  const params = new URLSearchParams(extra);
  if (range.start) params.set("start", range.start);
  if (range.end) params.set("end", range.end);
  return params;
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_ROOT}${path}`, {
    headers: { Accept: "application/json" },
    signal,
  });

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

  return (await response.json()) as T;
}

export const tallyApi = {
  health: (signal?: AbortSignal) => request<HealthResponse>("/health", signal),

  files: (range: DateRange, signal?: AbortSignal) =>
    request<FileOut[]>(
      `/files?${paramsFor(range, { limit: String(PAGE_LIMIT), offset: "0" })}`,
      signal,
    ),

  file: (fileId: number, signal?: AbortSignal) =>
    request<FileDetail>(`/files/${fileId}`, signal),

  productionSummary: (range: DateRange, signal?: AbortSignal) =>
    request<ProductionSummaryRow[]>(
      `/production-summary?${paramsFor(range, { limit: String(PAGE_LIMIT), offset: "0" })}`,
      signal,
    ),

  recovery: (range: DateRange, signal?: AbortSignal) =>
    request<RecoveryRow[]>(
      `/recovery?${paramsFor(range, { limit: String(PAGE_LIMIT), offset: "0" })}`,
      signal,
    ),

  solutionTotals: (range: DateRange, signal?: AbortSignal) =>
    request<SolutionTotalOut[]>(
      `/solutions?${paramsFor(range, {
        totals: "true",
        limit: String(PAGE_LIMIT),
        offset: "0",
      })}`,
      signal,
    ),

  rejectReasonTotals: (range: DateRange, signal?: AbortSignal) =>
    request<RejectReasonTotalOut[]>(
      `/reject-reasons?${paramsFor(range, {
        totals: "true",
        limit: String(PAGE_LIMIT),
        offset: "0",
      })}`,
      signal,
    ),

  gradeMix: (range: DateRange, signal?: AbortSignal) =>
    request<GradeMixRow[]>(
      `/grade-mix?${paramsFor(range, { group_by: "grade" })}`,
      signal,
    ),
};
