import { useState } from "react";
import type { Column } from "../DataTable";
import { DataTable } from "../DataTable";
import { Panel } from "../Panel";
import { QueryState } from "../QueryState";
import type { BoardShape, ProductionDisplayRow } from "../../utils/dashboardData";
import { displayValue, moneyFormatter } from "../../utils/formatting";
import { BoardVisualization } from "./BoardVisualization";
import { ColumnFilter } from "./ColumnFilter";

const columns: Array<Column<ProductionDisplayRow>> = [
  { key: "date", label: "Report date", render: (row) => row.report_datetime },
  { key: "start", label: "Start time", render: (row) => displayValue(row.time_start) },
  { key: "run", label: "Run time", render: (row) => displayValue(row.time_run) },
  { key: "no-production", label: "No production", render: (row) => displayValue(row.time_no_production) },
  { key: "pieces", label: "Input pieces", numeric: true, render: (row) => displayValue(row.board_input_pieces) },
  { key: "cuft", label: "Input cu ft", numeric: true, render: (row) => displayValue(row.board_input_cuft) },
  { key: "average-length", label: "Avg length ft", numeric: true, render: (row) => displayValue(row.average_length_ft) },
  { key: "bdft", label: "Edger bd ft", numeric: true, render: (row) => displayValue(row.edger_bd_ft) },
  { key: "trim-count", label: "Trim passes", numeric: true, render: (row) => displayValue(row.trim_pass_count) },
  { key: "trim-bdft", label: "Trim pass bd ft", numeric: true, render: (row) => displayValue(row.trim_pass_bd_ft) },
  { key: "value", label: "Lumber value", numeric: true, render: (row) => displayValue(row.lumber_value, moneyFormatter) },
  { key: "deducts", label: "Value deducts", numeric: true, render: (row) => displayValue(row.lumber_value_deducts, moneyFormatter) },
  { key: "lrf", label: "LRF BF/CM", numeric: true, render: (row) => displayValue(row.recovery_lrf_bf_cm) },
  { key: "recovery", label: "Recovery BF/CF", numeric: true, render: (row) => displayValue(row.recovery_bf_cf) },
  { key: "fiber", label: "Fiber ratio", numeric: true, render: (row) => displayValue(row.fiber_ratio) },
];

interface Props {
  view: "table" | "visual";
  onViewChange: (view: "table" | "visual") => void;
  rows: ProductionDisplayRow[];
  shapes: BoardShape[];
  tablePending: boolean;
  tableError: Error | null;
  visualPending: boolean;
  visualError: Error | null;
  onRetryTable: () => void;
  onRetryVisual: () => void;
}

export function ProductionSummary(props: Props) {
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => new Set());
  const optional = columns.filter((column) => column.key !== "date");
  const allOptionalVisible = optional.every((column) => !hiddenColumns.has(column.key));
  const toggleColumn = (key: string) => setHiddenColumns((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const toggleAll = () => setHiddenColumns(allOptionalVisible ? new Set(optional.map((column) => column.key)) : new Set());
  const visibleColumns = columns.filter((column) => !hiddenColumns.has(column.key));
  const action = <div className="summary-actions">
    <button className={`summary-view-toggle ${props.view === "visual" ? "show-visual" : ""}`} type="button" aria-pressed={props.view === "visual"} aria-label={`Switch to ${props.view === "table" ? "visual" : "table"} view`} onClick={() => props.onViewChange(props.view === "table" ? "visual" : "table")}>
      <span className={props.view === "table" ? "selected" : ""}>Table</span><span className={props.view === "visual" ? "selected" : ""}>Visual</span><span className="summary-view-toggle-thumb" aria-hidden="true" />
    </button>
    <ColumnFilter columns={columns} hiddenColumns={hiddenColumns} onToggleColumn={toggleColumn} onToggleAll={toggleAll} allOptionalVisible={allOptionalVisible} />
  </div>;

  return <section id="summary" className="wide-panel section-anchor"><Panel title="Production Summary" eyebrow="Report rows" action={action}>
    {props.view === "table" ? <QueryState isPending={props.tablePending} error={props.tableError} onRetry={props.onRetryTable}>
      <DataTable caption="Production Summary" columns={visibleColumns} rows={props.rows} rowKey={(row) => String(row.file_id)} emptyMessage="No production rows were returned for these dates." />
    </QueryState> : <QueryState isPending={props.visualPending} error={props.visualError} onRetry={props.onRetryVisual}><BoardVisualization shapes={props.shapes} /></QueryState>}
  </Panel></section>;
}
