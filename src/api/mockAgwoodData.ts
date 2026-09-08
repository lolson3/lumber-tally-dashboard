// Standalone fixture data for the Agwood dashboard. It intentionally mirrors the
// normalized tally tables without depending on either production API.
const reportDates = [
  "2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30", "2026-07-31",
  "2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07",
  "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14",
  "2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21",
  "2026-08-24", "2026-08-25",
];

export const agwoodMockTables = {
  files: reportDates.map((date, index) => ({
    file_id: 10_001 + index,
    filename: `agwood-${date.replaceAll("-", "")}-day.txt`,
    filename_date: date,
    report_datetime: `${date} 16:00:00`,
  })),
  summary: reportDates.map((_, index) => ({
    file_id: 10_001 + index,
    time_start: "06:00:00",
    time_run: `${String(8 + (index % 2)).padStart(2, "0")}:30:00`,
    time_no_production: "00:42:00",
    board_input_pieces: 3920 + index * 137,
    board_input_cuft: 5080 + index * 151,
    average_length_ft: 12.4 + (index % 3) * 0.3,
    edger_bd_ft: 43800 + index * 1260,
    trim_pass_count: 3310 + index * 94,
    trim_pass_bd_ft: 41700 + index * 1190,
    lumber_value: 28750 + index * 815,
    lumber_value_deducts: 720 + index * 21,
    recovery_lrf_bf_cm: 8.1 + index * 0.08,
    recovery_bf_cf: 8.62 + index * 0.07,
    fiber_ratio: 0.86 + (index % 3) * 0.01,
  })),
  solutions: reportDates.flatMap((_, index) => [1, 2, 3, 4].map((solution) => ({
    file_id: 10_001 + index,
    solution_number: solution,
    board_count: 710 + index * 31 - solution * 67,
  }))),
  reject_reasons: reportDates.flatMap((_, index) => [
    { file_id: 10_001 + index, reason: "Wane", count: 34 + index },
    { file_id: 10_001 + index, reason: "Sweep", count: 21 + (index % 4) * 3 },
    { file_id: 10_001 + index, reason: "No Decision", count: 12 + (index % 3) },
  ]),
  detail_lines: reportDates.flatMap((_, index) => [
    { file_id: 10_001 + index, wood_type: "Douglas Fir", thickness: "2", width: 4, grade: "#2 & Better", length_ft: 8, pieces: 820 + index * 19, bd_ft: 10933 + index * 253 },
    { file_id: 10_001 + index, wood_type: "Douglas Fir", thickness: "2", width: 6, grade: "#2 & Better", length_ft: 12, pieces: 690 + index * 17, bd_ft: 13800 + index * 340 },
    { file_id: 10_001 + index, wood_type: "Douglas Fir", thickness: "2", width: 8, grade: "Stud", length_ft: 10, pieces: 560 + index * 13, bd_ft: 12444 + index * 289 },
    { file_id: 10_001 + index, wood_type: "Hem-Fir", thickness: "2", width: 10, grade: "#3", length_ft: 16, pieces: 390 + index * 11, bd_ft: 10400 + index * 293 },
  ]),
} as const;
