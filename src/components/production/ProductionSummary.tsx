import { useState } from "react";
import type { Column } from "../DataTable";
import { DataTable } from "../DataTable";
import { Panel } from "../Panel";
import { QueryState } from "../QueryState";
import type { ProductionDisplayRow } from "../../utils/dashboardData";
import { displayValue, moneyFormatter, numberFormatter } from "../../utils/formatting";
import { adjustedRuntimeHours, formatRuntimeHours, runtimePercentage } from "../../utils/dashboardData";
import { ColumnFilter } from "./ColumnFilter";

const columns: Array<Column<ProductionDisplayRow>> = [
  { key: "date", label: "Report date", render: (row) => row.report_datetime },
  { key: "start", label: "Start time", render: (row) => displayValue(row.time_start) },
  { key: "run", label: "Run time", render: (row) => row.time_run ? formatRuntimeHours(adjustedRuntimeHours(row.time_run)) : "—" },
  { key: "run-percentage", label: "Run time %", numeric: true, render: (row) => row.time_run ? `${numberFormatter.format(runtimePercentage(row.time_run))}%` : "—" },
  { key: "no-production", label: "No production", render: (row) => displayValue(row.time_no_production) },
  { key: "pieces", label: "Input pieces", numeric: true, render: (row) => displayValue(row.board_input_pieces) },
  { key: "cuft", label: "Input cu ft", numeric: true, render: (row) => displayValue(row.board_input_cuft) },
  { key: "average-length", label: "Avg length ft", numeric: true, render: (row) => displayValue(row.average_length_ft) },
  { key: "bdft", label: "Edger bd ft", numeric: true, render: (row) => displayValue(row.edger_bd_ft) },
  { key: "trim-count", label: "Blank passes", numeric: true, render: (row) => displayValue(row.trim_pass_count) },
  { key: "trim-bdft", label: "Blank pass bd ft", numeric: true, render: (row) => displayValue(row.trim_pass_bd_ft) },
  { key: "value", label: "Lumber value", numeric: true, render: (row) => displayValue(row.lumber_value, moneyFormatter) },
  { key: "deducts", label: "Value deducts", numeric: true, render: (row) => displayValue(row.lumber_value_deducts, moneyFormatter) },
  { key: "lrf", label: "LRF BF/CM", numeric: true, render: (row) => displayValue(row.recovery_lrf_bf_cm) },
  { key: "recovery", label: "Recovery BF/CF", numeric: true, render: (row) => displayValue(row.recovery_bf_cf) },
  { key: "fiber", label: "Fiber ratio", numeric: true, render: (row) => displayValue(row.fiber_ratio) },
];

const defaultVisibleColumnKeys = new Set(["date", "run", "run-percentage", "pieces", "bdft", "trim-count", "value"]);

interface Props {
  rows: ProductionDisplayRow[];
  tablePending: boolean;
  tableError: Error | null;
  onRetryTable: () => void;
}

export function ProductionSummary(props: Props) {
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(
    () => new Set(columns.filter((column) => !defaultVisibleColumnKeys.has(column.key)).map((column) => column.key)),
  );
  const allColumnsVisible = columns.every((column) => !hiddenColumns.has(column.key));
  const toggleColumn = (key: string) => setHiddenColumns((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const toggleAll = () => setHiddenColumns(allColumnsVisible ? new Set(columns.map((column) => column.key)) : new Set());
  const visibleColumns = columns.filter((column) => !hiddenColumns.has(column.key));
  const action = <div className="summary-actions">
    <ColumnFilter columns={columns} hiddenColumns={hiddenColumns} onToggleColumn={toggleColumn} onToggleAll={toggleAll} allOptionalVisible={allColumnsVisible} />
  </div>;

  return <section id="summary" className="wide-panel section-anchor"><Panel title="Production Summary" eyebrow="Report rows" action={action}>
    <QueryState isPending={props.tablePending} error={props.tableError} onRetry={props.onRetryTable}>
      <DataTable caption="Production Summary" columns={visibleColumns} rows={props.rows} rowKey={(row) => String(row.file_id)} emptyMessage="No production rows were returned for these dates." />
    </QueryState>
  </Panel></section>;
}
