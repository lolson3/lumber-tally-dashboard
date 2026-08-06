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
} from "./types";

const API_ROOT = "/api";
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

function paramsFor(range: DateRange, extra: Record<string, string> = {}) {
  const params = new URLSearchParams(extra);
  if (range.start) params.set("start", range.start);
  if (range.end) params.set("end", range.end);
  return params;
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

  gradeMix: (range: DateRange, groupBy: GradeMixGrouping, signal?: AbortSignal) =>
    request<GradeMixRow[]>(
      `/grade-mix?${paramsFor(range, { group_by: groupBy })}`,
      signal,
    ),

  boardDimensionMix: (range: DateRange, signal?: AbortSignal) =>
    request<GradeMixRow[]>(
      `/grade-mix?${paramsFor(range, { group_by: "width,length_ft,thickness,grade" })}`,
      signal,
    ),
};
