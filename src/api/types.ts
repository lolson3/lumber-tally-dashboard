export interface HealthResponse {
  status: string;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface FileOut {
  file_id: number;
  filename: string;
  filename_date: string;
  report_datetime: string;
}

export interface ProductionSummaryRow {
  file_id: number;
  filename: string;
  report_datetime: string;
  time_start?: string | null;
  time_run?: string | null;
  time_no_production?: string | null;
  board_input_pieces?: number | null;
  board_input_cuft?: number | null;
  average_length_ft?: number | null;
  edger_bd_ft?: number | null;
  trim_pass_count?: number | null;
  trim_pass_bd_ft?: number | null;
  lumber_value?: number | null;
  lumber_value_deducts?: number | null;
}

export interface RecoveryRow {
  file_id: number;
  report_datetime: string;
  recovery_lrf_bf_cm?: number | null;
  recovery_bf_cf?: number | null;
  fiber_ratio?: number | null;
}

export interface SolutionTotalOut {
  solution_number: number;
  total_board_count: number;
}

export interface RejectReasonTotalOut {
  reason: string;
  total_count: number;
}

export interface GradeMixRow {
  grade?: string | null;
  thickness?: string | null;
  width?: number | null;
  length_ft?: number | null;
  total_pieces: number;
  total_bd_ft: number;
}

export type GradeMixGrouping = "thickness" | "width" | "grade" | "length_ft";

export interface SummaryOut {
  time_start?: string | null;
  time_run?: string | null;
  time_no_production?: string | null;
  board_input_pieces?: number | null;
  board_input_cuft?: number | null;
  average_length_ft?: number | null;
  edger_bd_ft?: number | null;
  trim_pass_count?: number | null;
  trim_pass_bd_ft?: number | null;
  lumber_value?: number | null;
  lumber_value_deducts?: number | null;
  recovery_lrf_bf_cm?: number | null;
  recovery_bf_cf?: number | null;
  fiber_ratio?: number | null;
}

export interface FileDetail extends FileOut {
  summary?: SummaryOut | null;
  solutions: Array<{ solution_number: number; board_count: number }>;
  reject_reasons: Array<{ reason: string; count: number }>;
  detail_lines: Array<{
    wood_type: string;
    thickness: string;
    width: number;
    grade: string;
    length_ft: number;
    pieces: number;
    bd_ft: number;
  }>;
}
