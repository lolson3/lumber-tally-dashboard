import type { FileOut, GradeMixGrouping, GradeMixRow, ProductionSummaryRow, RecoveryRow } from "../api/types";
import { numberFormatter } from "./formatting";

const naturalLabelCollator = new Intl.Collator("en-US", { numeric: true, sensitivity: "base" });

export function latestReportDate(files: Array<{ filename_date?: string; report_datetime: string }>) {
  return files.reduce<string | null>((latest, file) => {
    const date = file.filename_date || file.report_datetime.slice(0, 10);
    return date && (!latest || date > latest) ? date : latest;
  }, null);
}

function numericLabelValue(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/^#\s*/, "");
  const mixedFraction = normalized.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
  if (mixedFraction) {
    const [, whole = "0", numerator, denominator] = mixedFraction;
    return Number(whole) + Number(numerator) / Number(denominator);
  }
  return /^\d+(?:\.\d+)?$/.test(normalized) ? Number(normalized) : null;
}

export function sortMixRows(rows: GradeMixRow[], grouping: GradeMixGrouping) {
  return [...rows].sort((left, right) => {
    const leftValue = left[grouping];
    const rightValue = right[grouping];
    const leftNumeric = numericLabelValue(leftValue);
    const rightNumeric = numericLabelValue(rightValue);
    if (leftNumeric !== null && rightNumeric !== null) return leftNumeric - rightNumeric;
    if (leftNumeric !== null) return -1;
    if (rightNumeric !== null) return 1;
    return naturalLabelCollator.compare(String(leftValue ?? ""), String(rightValue ?? ""));
  });
}

export type ProductionDisplayRow = ProductionSummaryRow & Pick<
  RecoveryRow,
  "recovery_lrf_bf_cm" | "recovery_bf_cf" | "fiber_ratio"
>;

export interface BoardShape {
  width: number;
  lengthFt: number;
  pieces: number;
  boardFeet: number;
  percentage: number;
  breakdown: Array<{ thickness: string; grade: string; pieces: number; boardFeet: number }>;
}

export interface ProductBreakdownRow {
  product: string;
  width: number;
  lengthFt: number;
  pieces: number;
  boardFeet: number;
  percentage: number;
}

export type ProductBreakdownSort = "ascending" | "descending" | "most-pieces" | "least-pieces" | "pareto";

export function sumNullable(values: Array<number | null | undefined>) {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

export function countReportDays(files: FileOut[]) {
  return new Set(files.map((file) => file.filename_date || file.report_datetime.slice(0, 10)).filter(Boolean)).size;
}

export function runtimeHours(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value?.trim()) return 0;
  const normalized = value.trim().toLowerCase();

  const colonDuration = normalized.match(/^(?:(\d+)\s+days?,?\s+)?(\d+):(\d{2})(?::(\d{2}(?:\.\d+)?))?$/);
  if (colonDuration) {
    const [, days = "0", hours, minutes, seconds = "0"] = colonDuration;
    return Number(days) * 24 + Number(hours) + Number(minutes) / 60 + Number(seconds) / 3_600;
  }

  const isoDuration = normalized.match(/^p(?:(\d+(?:\.\d+)?)d)?t?(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?$/);
  if (isoDuration && isoDuration.slice(1).some(Boolean)) {
    const [, days = "0", hours = "0", minutes = "0", seconds = "0"] = isoDuration;
    return Number(days) * 24 + Number(hours) + Number(minutes) / 60 + Number(seconds) / 3_600;
  }

  const units = [...normalized.matchAll(/(\d+(?:\.\d+)?)\s*(days?|d|hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\b/g)];
  if (units.length) return units.reduce((total, [, amount, unit]) => {
    if (unit.startsWith("d")) return total + Number(amount) * 24;
    if (unit.startsWith("h")) return total + Number(amount);
    if (unit.startsWith("m")) return total + Number(amount) / 60;
    return total + Number(amount) / 3_600;
  }, 0);

  const numericHours = Number(normalized);
  return Number.isFinite(numericHours) ? numericHours : 0;
}

export function sumRuntimeHours(values: Array<string | number | null | undefined>) {
  return values.reduce<number>((total, value) => total + runtimeHours(value), 0);
}

export function adjustedRuntimeHours(value: string | number | null | undefined) {
  return Math.max(0, runtimeHours(value) - 1);
}

export function sumAdjustedRuntimeHours(values: Array<string | number | null | undefined>) {
  return values.reduce<number>((total, value) => total + adjustedRuntimeHours(value), 0);
}

export function runtimePercentage(value: string | number | null | undefined) {
  return adjustedRuntimeHours(value) / 9.5 * 100;
}

export function formatRuntimeHours(hours: number) {
  const totalSeconds = Math.round(hours * 3_600);
  const displayHours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor(totalSeconds % 3_600 / 60);
  const seconds = totalSeconds % 60;
  return `${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function mergeProductionRecovery(production: ProductionSummaryRow[], recovery: RecoveryRow[]): ProductionDisplayRow[] {
  const recoveryByFile = new Map(recovery.map((row) => [row.file_id, row]));
  return production.map((row) => {
    const recoveryRow = recoveryByFile.get(row.file_id);
    return { ...row, recovery_lrf_bf_cm: recoveryRow?.recovery_lrf_bf_cm, recovery_bf_cf: recoveryRow?.recovery_bf_cf, fiber_ratio: recoveryRow?.fiber_ratio };
  });
}

export function buildBoardShapes(rows: GradeMixRow[]): BoardShape[] {
  const shapes = new Map<string, BoardShape>();
  for (const row of rows) {
    if (row.width == null || row.length_ft == null) continue;
    const key = `${row.width}-${row.length_ft}`;
    const shape = shapes.get(key) ?? { width: row.width, lengthFt: row.length_ft, pieces: 0, boardFeet: 0, percentage: 0, breakdown: [] };
    shape.pieces += row.total_pieces;
    shape.boardFeet += row.total_bd_ft;
    shape.breakdown.push({ thickness: row.thickness ?? "Unknown", grade: row.grade ?? "Unknown", pieces: row.total_pieces, boardFeet: row.total_bd_ft });
    shapes.set(key, shape);
  }
  const totalPieces = [...shapes.values()].reduce((total, shape) => total + shape.pieces, 0);
  return [...shapes.values()].map((shape) => ({
    ...shape,
    percentage: totalPieces ? shape.pieces / totalPieces * 100 : 0,
  })).sort((a, b) => a.width - b.width || a.lengthFt - b.lengthFt);
}

export function sortBoardShapes(shapes: BoardShape[], direction: ProductBreakdownSort = "ascending") {
  const result = [...shapes];
  result.sort((left, right) => {
    const sizeDifference = left.width - right.width || left.lengthFt - right.lengthFt;
    if (direction === "most-pieces" || direction === "pareto") return right.pieces - left.pieces || sizeDifference;
    if (direction === "least-pieces") return left.pieces - right.pieces || sizeDifference;
    const difference = sizeDifference;
    return direction === "ascending" ? difference : -difference;
  });
  return result;
}

export function buildProductBreakdown(rows: GradeMixRow[], direction: ProductBreakdownSort = "ascending") {
  return sortBoardShapes(buildBoardShapes(rows), direction).map(({ width, lengthFt, pieces, boardFeet, percentage }) => ({
    product: `${numberFormatter.format(width)} in × ${numberFormatter.format(lengthFt)} ft`,
    width, lengthFt, pieces, boardFeet, percentage,
  }));
}
