import type { GradeMixGrouping, GradeMixRow, ProductionSummaryRow, RecoveryRow } from "../api/types";

const naturalLabelCollator = new Intl.Collator("en-US", { numeric: true, sensitivity: "base" });

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
  breakdown: Array<{ thickness: string; grade: string; pieces: number; boardFeet: number }>;
}

export function sumNullable(values: Array<number | null | undefined>) {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
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
    const shape = shapes.get(key) ?? { width: row.width, lengthFt: row.length_ft, breakdown: [] };
    shape.breakdown.push({ thickness: row.thickness ?? "Unknown", grade: row.grade ?? "Unknown", pieces: row.total_pieces, boardFeet: row.total_bd_ft });
    shapes.set(key, shape);
  }
  return [...shapes.values()].sort((a, b) => a.width - b.width || a.lengthFt - b.lengthFt);
}
