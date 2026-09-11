// Deterministic, in-memory demo data. Generating it at module load keeps a
// checkout clean while ensuring every demo includes today and the prior 89 days.
const reportCount = 90;
const seedText = import.meta.env.VITE_FAKE_DATA_SEED || "demo-seed-v1";
let randomState = [...seedText].reduce(
  (hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16_777_619),
  2_166_136_261,
) >>> 0;

function random() {
  randomState = (Math.imul(randomState, 1_664_525) + 1_013_904_223) >>> 0;
  return randomState / 2 ** 32;
}

function vary(amount: number) {
  return Math.round((random() - 0.5) * amount);
}

const today = new Date();
const endDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12));
const reportDates = Array.from({ length: reportCount }, (_, offset) => {
  const date = new Date(endDate);
  date.setUTCDate(date.getUTCDate() - (reportCount - offset - 1));
  return date.toISOString().slice(0, 10);
});

const productMix = [
  { wood_type: "Species A", thickness: "2", width: 4, grade: "Grade B", length_ft: 8, basePieces: 470 },
  { wood_type: "Species B", thickness: "2", width: 4, grade: "Grade A", length_ft: 12, basePieces: 760 },
  { wood_type: "Species A", thickness: "2", width: 6, grade: "Grade A", length_ft: 10, basePieces: 910 },
  { wood_type: "Species B", thickness: "2", width: 6, grade: "Grade C", length_ft: 16, basePieces: 540 },
  { wood_type: "Species A", thickness: "2", width: 8, grade: "Grade B", length_ft: 8, basePieces: 680 },
  { wood_type: "Species B", thickness: "2", width: 8, grade: "Grade A", length_ft: 14, basePieces: 830 },
  { wood_type: "Species A", thickness: "2", width: 10, grade: "Grade C", length_ft: 12, basePieces: 590 },
  { wood_type: "Species B", thickness: "2", width: 12, grade: "Grade B", length_ft: 16, basePieces: 720 },
] as const;

export const demoMockTables = {
  files: reportDates.map((date, index) => ({
    file_id: 10_001 + index,
    filename: `demo-${date.replaceAll("-", "")}-day.txt`,
    filename_date: date,
    report_datetime: `${date} 16:00:00`,
  })),
  summary: reportDates.map((_, index) => ({
    file_id: 10_001 + index,
    time_start: "06:00:00",
    time_run: `${String(8 + (index % 2)).padStart(2, "0")}:30:00`,
    time_no_production: "00:42:00",
    board_input_pieces: 3920 + index * 137 + vary(120),
    board_input_cuft: 5080 + index * 151 + vary(140),
    average_length_ft: 12.4 + (index % 3) * 0.3,
    edger_bd_ft: 43800 + index * 1260 + vary(900),
    trim_pass_count: 3310 + index * 94 + vary(80),
    trim_pass_bd_ft: 41700 + index * 1190 + vary(850),
    lumber_value: 28750 + index * 815 + vary(600),
    lumber_value_deducts: 720 + index * 21 + vary(30),
    recovery_lrf_bf_cm: 8.1 + index * 0.08,
    recovery_bf_cf: 8.62 + index * 0.07,
    fiber_ratio: 0.86 + (index % 3) * 0.01,
  })),
  solutions: reportDates.flatMap((_, index) => [1, 2, 3, 4].map((solution) => ({
    file_id: 10_001 + index,
    solution_number: solution,
    board_count: 710 + index * 31 - solution * 67 + vary(20),
  }))),
  reject_reasons: reportDates.flatMap((_, index) => [
    { file_id: 10_001 + index, reason: "Wane", count: 34 + index },
    { file_id: 10_001 + index, reason: "Sweep", count: 21 + (index % 4) * 3 },
    { file_id: 10_001 + index, reason: "No Decision", count: 12 + (index % 3) },
  ]),
  detail_lines: reportDates.flatMap((_, index) => productMix.map((product, productIndex) => {
    const seasonalShift = Math.round(Math.sin(index / 6 + productIndex * 0.9) * 95);
    const pieces = Math.max(50, product.basePieces + seasonalShift + vary(180));
    return {
      file_id: 10_001 + index,
      wood_type: product.wood_type,
      thickness: product.thickness,
      width: product.width,
      grade: product.grade,
      length_ft: product.length_ft,
      pieces,
      bd_ft: Math.round(pieces * Number(product.thickness) * product.width * product.length_ft / 12),
    };
  })),
} as const;
