import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { tallyApi } from "./api/client";
import type { DateRange, FileOut, ProductionSummaryRow } from "./api/types";
import { DataTable, type Column } from "./components/DataTable";
import { Panel } from "./components/Panel";
import { QueryState } from "./components/QueryState";

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function todayRange(): DateRange {
  const today = new Date().toLocaleDateString("en-CA");
  return { start: today, end: today };
}

function display(value: string | number | null | undefined, formatter = number) {
  if (value === null || value === undefined || value === "") return "—";
  return typeof value === "number" ? formatter.format(value) : value;
}

function sum(values: Array<number | null | undefined>) {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

export function App() {
  const [draftRange, setDraftRange] = useState<DateRange>(todayRange);
  const [range, setRange] = useState<DateRange>(todayRange);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const invalidRange = Boolean(draftRange.start && draftRange.end && draftRange.start > draftRange.end);

  useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => tallyApi.health(signal),
    refetchInterval: 60_000,
  });
  const files = useQuery({
    queryKey: ["files", range],
    queryFn: ({ signal }) => tallyApi.files(range, signal),
  });
  const production = useQuery({
    queryKey: ["production-summary", range],
    queryFn: ({ signal }) => tallyApi.productionSummary(range, signal),
  });
  const recovery = useQuery({
    queryKey: ["recovery", range],
    queryFn: ({ signal }) => tallyApi.recovery(range, signal),
  });
  const solutions = useQuery({
    queryKey: ["solution-totals", range],
    queryFn: ({ signal }) => tallyApi.solutionTotals(range, signal),
  });
  const rejects = useQuery({
    queryKey: ["reject-reason-totals", range],
    queryFn: ({ signal }) => tallyApi.rejectReasonTotals(range, signal),
  });
  const gradeMix = useQuery({
    queryKey: ["grade-mix", range],
    queryFn: ({ signal }) => tallyApi.gradeMix(range, signal),
  });
  const fileDetail = useQuery({
    queryKey: ["file-detail", selectedFileId],
    queryFn: ({ signal }) => tallyApi.file(selectedFileId!, signal),
    enabled: selectedFileId !== null,
  });

  const metrics = useMemo(() => {
    const rows = production.data ?? [];
    return [
      { label: "Reports", value: number.format(files.data?.length ?? 0) },
      { label: "Input pieces", value: number.format(sum(rows.map((row) => row.board_input_pieces))) },
      { label: "Input volume", value: number.format(sum(rows.map((row) => row.board_input_cuft))), unit: "cu ft" },
      { label: "Edger output", value: number.format(sum(rows.map((row) => row.edger_bd_ft))), unit: "bd ft" },
      { label: "Lumber value", value: money.format(sum(rows.map((row) => row.lumber_value))) },
    ];
  }, [files.data, production.data]);

  const productionColumns: Array<Column<ProductionSummaryRow>> = [
    { key: "date", label: "Report date", render: (row) => row.report_datetime },
    { key: "file", label: "File", render: (row) => row.filename },
    { key: "pieces", label: "Input pieces", numeric: true, render: (row) => display(row.board_input_pieces) },
    { key: "cuft", label: "Input cu ft", numeric: true, render: (row) => display(row.board_input_cuft) },
    { key: "bdft", label: "Edger bd ft", numeric: true, render: (row) => display(row.edger_bd_ft) },
    { key: "value", label: "Lumber value", numeric: true, render: (row) => display(row.lumber_value, money) },
  ];

  const fileColumns: Array<Column<FileOut>> = [
    { key: "id", label: "ID", numeric: true, render: (row) => row.file_id },
    { key: "filename", label: "Filename", render: (row) => row.filename },
    { key: "filedate", label: "File date", render: (row) => row.filename_date },
    { key: "reportdate", label: "Report date", render: (row) => row.report_datetime },
    {
      key: "actions",
      label: "Details",
      render: (row) => (
        <button className="text-button" type="button" onClick={() => setSelectedFileId(row.file_id)}>
          View report
        </button>
      ),
    },
  ];

  const isRefreshing = [files, production, recovery, solutions, rejects, gradeMix].some(
    (query) => query.isFetching,
  );

  function applyRange(event: React.FormEvent) {
    event.preventDefault();
    if (!invalidRange) {
      setSelectedFileId(null);
      setRange(draftRange);
    }
  }

  function showAllDates() {
    const allDates = { start: "", end: "" };
    setDraftRange(allDates);
    setRange(allDates);
    setSelectedFileId(null);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="Tally Dashboard home">
          <span className="brand-mark" aria-hidden="true">T</span>
          <span>Tally Dashboard</span>
        </a>
        <nav aria-label="Dashboard sections">
          <a className="nav-link active" href="#overview">Overview</a>
          <a className="nav-link" href="#production">Production</a>
          <a className="nav-link" href="#recovery">Recovery</a>
          <a className="nav-link" href="#reports">Reports</a>
        </nav>
        <p className="sidebar-note">Lumber production reporting</p>
      </aside>

      <div className="dashboard-surface">
        <header className="page-header">
          <div>
            <p className="eyebrow">Operations</p>
            <h1>Production overview</h1>
          </div>
          {isRefreshing && <span className="refresh-status" aria-live="polite">Refreshing…</span>}
        </header>

        <main id="overview">
        <section className="filter-bar" aria-labelledby="date-filter-heading">
          <div>
            <p className="eyebrow">Data window</p>
            <h2 id="date-filter-heading">Choose report dates</h2>
          </div>
          <form onSubmit={applyRange}>
            <label>
              Start date
              <input
                className="calendar-input"
                type="date"
                value={draftRange.start}
                max={draftRange.end || undefined}
                onChange={(event) => setDraftRange((current) => ({ ...current, start: event.target.value }))}
              />
            </label>
            <label>
              End date
              <input
                type="date"
                value={draftRange.end}
                min={draftRange.start || undefined}
                onChange={(event) => setDraftRange((current) => ({ ...current, end: event.target.value }))}
              />
            </label>
            <button className="primary-button" type="submit" disabled={invalidRange}>Apply dates</button>
            <button className="secondary-button" type="button" onClick={showAllDates}>All dates</button>
          </form>
          {invalidRange && <p className="validation-message" role="alert">Start date must be on or before end date.</p>}
          <p className="filter-note">
            Showing {range.start || "earliest available"} through {range.end || "latest available"}.
            {isRefreshing && <span aria-live="polite"> Refreshing…</span>}
          </p>
        </section>

        <section className="metric-grid" aria-label="Production overview">
          {metrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <p>{metric.label}</p>
              <strong>{metric.value}</strong>
              {metric.unit && <span>{metric.unit}</span>}
            </article>
          ))}
        </section>

        <div className="dashboard-grid">
          <section id="production" className="wide-panel section-anchor">
          <Panel title="Production summary" eyebrow="Report rows">
            <QueryState isPending={production.isPending} error={production.error}>
              <DataTable
                caption="Production summary"
                columns={productionColumns}
                rows={production.data ?? []}
                rowKey={(row) => String(row.file_id)}
                emptyMessage="No production rows were returned for these dates."
              />
            </QueryState>
          </Panel>
          </section>

          <Panel title="Grade mix" eyebrow="Board feet by grade">
            <QueryState isPending={gradeMix.isPending} error={gradeMix.error}>
              {(gradeMix.data?.length ?? 0) > 0 ? (
                <div className="chart-wrap" aria-label="Grade mix bar chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gradeMix.data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="grade" tickLine={false} />
                      <YAxis tickLine={false} width={54} />
                      <Tooltip formatter={(value) => [number.format(Number(value)), "Board feet"]} />
                      <Bar dataKey="total_bd_ft" fill="#d9963b" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="empty-state">No grade-mix data was returned for these dates.</p>}
            </QueryState>
          </Panel>

          <section id="recovery" className="section-anchor">
          <Panel title="Recovery" eyebrow="Per report">
            <QueryState isPending={recovery.isPending} error={recovery.error}>
              <DataTable
                caption="Recovery metrics"
                columns={[
                  { key: "date", label: "Report date", render: (row) => row.report_datetime },
                  { key: "lrf", label: "LRF BF/CM", numeric: true, render: (row) => display(row.recovery_lrf_bf_cm) },
                  { key: "bfcf", label: "BF/CF", numeric: true, render: (row) => display(row.recovery_bf_cf) },
                  { key: "fiber", label: "Fiber ratio", numeric: true, render: (row) => display(row.fiber_ratio) },
                ]}
                rows={recovery.data ?? []}
                rowKey={(row) => String(row.file_id)}
                emptyMessage="No recovery data was returned for these dates."
              />
            </QueryState>
          </Panel>
          </section>

          <Panel title="Solution totals" eyebrow="Board count">
            <QueryState isPending={solutions.isPending} error={solutions.error}>
              <DataTable
                caption="Solution totals"
                columns={[
                  { key: "solution", label: "Solution", numeric: true, render: (row) => row.solution_number },
                  { key: "count", label: "Boards", numeric: true, render: (row) => number.format(row.total_board_count) },
                ]}
                rows={solutions.data ?? []}
                rowKey={(row) => String(row.solution_number)}
                emptyMessage="No solution totals were returned for these dates."
              />
            </QueryState>
          </Panel>

          <Panel title="Reject reasons" eyebrow="Aggregated count">
            <QueryState isPending={rejects.isPending} error={rejects.error}>
              <DataTable
                caption="Reject reason totals"
                columns={[
                  { key: "reason", label: "Reason", render: (row) => row.reason },
                  { key: "count", label: "Count", numeric: true, render: (row) => number.format(row.total_count) },
                ]}
                rows={rejects.data ?? []}
                rowKey={(row) => row.reason}
                emptyMessage="No reject reasons were returned for these dates."
              />
            </QueryState>
          </Panel>

          <section id="reports" className="wide-panel section-anchor">
          <Panel title="Report files" eyebrow="Available source reports">
            <QueryState isPending={files.isPending} error={files.error}>
              <DataTable
                caption="Report files"
                columns={fileColumns}
                rows={files.data ?? []}
                rowKey={(row) => String(row.file_id)}
                emptyMessage="No report files were returned for these dates."
              />
            </QueryState>
          </Panel>
          </section>
        </div>

        {selectedFileId !== null && (
          <section className="detail-drawer" aria-labelledby="file-detail-heading">
            <header>
              <div>
                <p className="eyebrow">Complete report</p>
                <h2 id="file-detail-heading">File {selectedFileId}</h2>
              </div>
              <button className="secondary-button" type="button" onClick={() => setSelectedFileId(null)}>Close</button>
            </header>
            <QueryState isPending={fileDetail.isPending} error={fileDetail.error}>
              {fileDetail.data && (
                <>
                  <p className="detail-name">{fileDetail.data.filename}</p>
                  <div className="detail-summary">
                    {Object.entries(fileDetail.data.summary ?? {}).map(([key, value]) => (
                      <div key={key}><span>{key.replaceAll("_", " ")}</span><strong>{display(value)}</strong></div>
                    ))}
                  </div>
                  <details>
                    <summary>Raw report JSON</summary>
                    <pre>{JSON.stringify(fileDetail.data, null, 2)}</pre>
                  </details>
                </>
              )}
            </QueryState>
          </section>
        )}
        </main>
      </div>
    </div>
  );
}
