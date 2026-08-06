import { useEffect, useMemo, useRef, useState } from "react";
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
import type { DateRange, FileOut, ProductionSummaryRow, RecoveryRow } from "./api/types";
import { DataTable, type Column } from "./components/DataTable";
import { Panel } from "./components/Panel";
import { QueryState } from "./components/QueryState";
import treeLogo from "./img/tree.svg";

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

function followChartTooltip(chart: HTMLDivElement | null, clientX: number, clientY: number) {
  const tooltip = chart?.querySelector<HTMLElement>(".recharts-tooltip-wrapper");
  if (!chart || !tooltip) return;

  const bounds = chart.getBoundingClientRect();
  tooltip.style.transform = `translate(${clientX - bounds.left + 14}px, ${clientY - bounds.top + 14}px)`;
}

const plcOptions = [
  "Board Edger",
  "Chopsaw",
  "Twin",
  "BakerInFeed",
  "Single",
  "Gang",
  "Swede",
  "Trimmer",
  "Debarker",
  "Baker",
  "Quad",
] as const;

const dashboardSections = ["data-selection", "summary", "grade-mix", "solutions-rejects", "reports"] as const;

type ProductionDisplayRow = ProductionSummaryRow & Pick<
  RecoveryRow,
  "recovery_lrf_bf_cm" | "recovery_bf_cf" | "fiber_ratio"
>;

export function App() {
  const [draftRange, setDraftRange] = useState<DateRange>(todayRange);
  const [range, setRange] = useState<DateRange>(todayRange);
  const [selectedPlc, setSelectedPlc] = useState<(typeof plcOptions)[number]>("Board Edger");
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [rawJsonOpen, setRawJsonOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<(typeof dashboardSections)[number]>("data-selection");
  const gradeChartRef = useRef<HTMLDivElement>(null);
  const solutionChartRef = useRef<HTMLDivElement>(null);
  const invalidRange = Boolean(draftRange.start && draftRange.end && draftRange.start > draftRange.end);

  useEffect(() => {
    let animationFrame = 0;

    const updateActiveSection = () => {
      animationFrame = 0;
      let currentSection: (typeof dashboardSections)[number] = "data-selection";

      for (const sectionId of dashboardSections) {
        const section = document.getElementById(sectionId);
        const sectionBoundary = sectionId === "data-selection" ? 1 : 9;
        if (section && section.getBoundingClientRect().top <= sectionBoundary) currentSection = sectionId;
      }
      setActiveSection(currentSection);
      const nextHash = `#${currentSection}`;
      if (window.location.hash !== nextHash) {
        window.history.replaceState(window.history.state, "", nextHash);
      }
    };

    const scheduleUpdate = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => tallyApi.health(signal),
    refetchInterval: 60_000,
  });
  const files = useQuery({
    queryKey: ["files", selectedPlc, range],
    queryFn: ({ signal }) => tallyApi.files(range, signal),
  });
  const production = useQuery({
    queryKey: ["production-summary", selectedPlc, range],
    queryFn: ({ signal }) => tallyApi.productionSummary(range, signal),
  });
  const recovery = useQuery({
    queryKey: ["recovery", selectedPlc, range],
    queryFn: ({ signal }) => tallyApi.recovery(range, signal),
  });
  const solutions = useQuery({
    queryKey: ["solution-totals", selectedPlc, range],
    queryFn: ({ signal }) => tallyApi.solutionTotals(range, signal),
  });
  const rejects = useQuery({
    queryKey: ["reject-reason-totals", selectedPlc, range],
    queryFn: ({ signal }) => tallyApi.rejectReasonTotals(range, signal),
  });
  const gradeMix = useQuery({
    queryKey: ["grade-mix", selectedPlc, range],
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
      { label: "Input Pieces", value: number.format(sum(rows.map((row) => row.board_input_pieces))) },
      { label: "Input Volume", value: number.format(sum(rows.map((row) => row.board_input_cuft))), unit: "cu ft" },
      { label: "Edger Output", value: number.format(sum(rows.map((row) => row.edger_bd_ft))), unit: "bd ft" },
      { label: "Projected Lumber Value", value: money.format(sum(rows.map((row) => row.lumber_value))) },
    ];
  }, [files.data, production.data]);

  const productionRows = useMemo<Array<ProductionDisplayRow>>(() => {
    const recoveryByFile = new Map((recovery.data ?? []).map((row) => [row.file_id, row]));
    return (production.data ?? []).map((row) => {
      const recoveryRow = recoveryByFile.get(row.file_id);
      return {
        ...row,
        recovery_lrf_bf_cm: recoveryRow?.recovery_lrf_bf_cm,
        recovery_bf_cf: recoveryRow?.recovery_bf_cf,
        fiber_ratio: recoveryRow?.fiber_ratio,
      };
    });
  }, [production.data, recovery.data]);

  const productionColumns: Array<Column<ProductionDisplayRow>> = [
    { key: "date", label: "Report date", render: (row) => row.report_datetime },
    { key: "start", label: "Start time", render: (row) => display(row.time_start) },
    { key: "run", label: "Run time", render: (row) => display(row.time_run) },
    { key: "no-production", label: "No production", render: (row) => display(row.time_no_production) },
    { key: "pieces", label: "Input pieces", numeric: true, render: (row) => display(row.board_input_pieces) },
    { key: "cuft", label: "Input cu ft", numeric: true, render: (row) => display(row.board_input_cuft) },
    { key: "average-length", label: "Avg length ft", numeric: true, render: (row) => display(row.average_length_ft) },
    { key: "bdft", label: "Edger bd ft", numeric: true, render: (row) => display(row.edger_bd_ft) },
    { key: "trim-count", label: "Trim passes", numeric: true, render: (row) => display(row.trim_pass_count) },
    { key: "trim-bdft", label: "Trim pass bd ft", numeric: true, render: (row) => display(row.trim_pass_bd_ft) },
    { key: "value", label: "Lumber value", numeric: true, render: (row) => display(row.lumber_value, money) },
    { key: "deducts", label: "Value deducts", numeric: true, render: (row) => display(row.lumber_value_deducts, money) },
    { key: "lrf", label: "LRF BF/CM", numeric: true, render: (row) => display(row.recovery_lrf_bf_cm) },
    { key: "recovery", label: "Recovery BF/CF", numeric: true, render: (row) => display(row.recovery_bf_cf) },
    { key: "fiber", label: "Fiber ratio", numeric: true, render: (row) => display(row.fiber_ratio) },
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
        <a className="brand" href="#data-selection" aria-label="Tally Dashboard home">
          <span className="brand-mark" aria-hidden="true">
            <img src={treeLogo} alt="" />
          </span>
          <span>Tally Dashboard</span>
        </a>
        <nav aria-label="Dashboard sections">
          <a className={`nav-link ${activeSection === "data-selection" ? "active" : ""}`} href="#data-selection">Data Selection</a>
          <a className={`nav-link ${activeSection === "summary" ? "active" : ""}`} href="#summary">Summary</a>
          <a className={`nav-link ${activeSection === "grade-mix" ? "active" : ""}`} href="#grade-mix">Grade Mix</a>
          <a className={`nav-link ${activeSection === "solutions-rejects" ? "active" : ""}`} href="#solutions-rejects">Solutions &amp; Rejects</a>
          <a className={`nav-link ${activeSection === "reports" ? "active" : ""}`} href="#reports">Reports</a>
        </nav>
      </aside>

      <div className="dashboard-surface">
        <header id="data-selection" className="page-header section-anchor">
          <div>
            <p className="eyebrow">Sequoia Forest Products</p>
            <h1>Production Overview</h1>
          </div>
        </header>

        <main>
        <section className="filter-bar" aria-labelledby="date-filter-heading">
          <div>
            <p className="eyebrow">Data selection</p>
            <h2 id="date-filter-heading">Choose Report Dates</h2>
          </div>
          <form onSubmit={applyRange}>
            <label className="plc-control" htmlFor="plc-select">
              PLC
              <select
                className="window-input"
                id="plc-select"
                value={selectedPlc}
                onChange={(event) => {
                  setSelectedPlc(event.target.value as (typeof plcOptions)[number]);
                  setSelectedFileId(null);
                }}
              >
                {plcOptions.map((plc) => (
                  <option key={plc} value={plc} disabled={plc !== "Board Edger"}>
                    {plc}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Start date
              <input
                className="window-input"
                type="date"
                value={draftRange.start}
                max={draftRange.end || undefined}
                onChange={(event) => setDraftRange((current) => ({ ...current, start: event.target.value }))}
              />
            </label>
            <label>
              End date
              <input
                className="window-input"
                type="date"
                value={draftRange.end}
                min={draftRange.start || undefined}
                onChange={(event) => setDraftRange((current) => ({ ...current, end: event.target.value }))}
              />
            </label>
            <button className="primary-button" type="submit" disabled={invalidRange}>Apply Dates</button>
            <button className="secondary-button" type="button" onClick={showAllDates}>All Dates</button>
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
          <section id="summary" className="wide-panel section-anchor">
          <Panel title="Production Summary" eyebrow="Report rows">
            <QueryState
              isPending={production.isPending || recovery.isPending}
              error={production.error ?? recovery.error}
              onRetry={() => { void production.refetch(); void recovery.refetch(); }}
            >
              <DataTable
                caption="Production Summary"
                columns={productionColumns}
                rows={productionRows}
                rowKey={(row) => String(row.file_id)}
                emptyMessage="No production rows were returned for these dates."
              />
            </QueryState>
          </Panel>
          </section>

          <section id="grade-mix" className="wide-panel section-anchor">
          <Panel title="Grade Mix" eyebrow="Board feet by grade" className="chart-panel">
            <QueryState isPending={gradeMix.isPending} error={gradeMix.error} onRetry={() => { void gradeMix.refetch(); }}>
              {(gradeMix.data?.length ?? 0) > 0 ? (
                <div className="chart-wrap" aria-label="Grade mix bar chart" ref={gradeChartRef}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={gradeMix.data}
                      margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                      onMouseMove={(_, event) => followChartTooltip(gradeChartRef.current, event.clientX, event.clientY)}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="grade" tickLine={false} />
                      <YAxis tickLine={false} width={72} />
                      <Tooltip
                        position={{ x: 0, y: 0 }}
                        isAnimationActive={false}
                        cursor={false}
                        formatter={(value) => [number.format(Number(value)), "Board feet"]}
                      />
                      <Bar dataKey="total_bd_ft" fill="#f5a623" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="empty-state">No grade-mix data was returned for these dates.</p>}
            </QueryState>
          </Panel>
          </section>

          <section id="solutions-rejects" className="wide-panel paired-panel-row section-anchor">
          <Panel title="Solution Totals" eyebrow="Board Count by Solution " className="chart-panel solution-chart-panel">
            <QueryState isPending={solutions.isPending} error={solutions.error} onRetry={() => { void solutions.refetch(); }}>
              {(solutions.data?.length ?? 0) > 0 ? (
                <div className="chart-wrap" aria-label="Board count by solution number bar chart" ref={solutionChartRef}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={solutions.data}
                      margin={{ top: 8, right: 8, left: 8, bottom: -10 }}
                      onMouseMove={(_, event) => followChartTooltip(solutionChartRef.current, event.clientX, event.clientY)}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="solution_number"
                        tickLine={false}
                        label={{ position: "insideBottom", offset: -14 }}
                      />
                      <YAxis
                        tickLine={false}
                        width={72}
                        label={{ angle: -90, position: "insideLeft" }}
                      />
                      <Tooltip
                        position={{ x: 0, y: 0 }}
                        isAnimationActive={false}
                        cursor={false}
                        formatter={(value) => [number.format(Number(value)), "Board count"]}
                        labelFormatter={(label) => `Solution ${label}`}
                      />
                      <Bar dataKey="total_board_count" fill="#468f60" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="empty-state">No solution totals were returned for these dates.</p>}
            </QueryState>
          </Panel>

          <Panel title="Reject Reasons" eyebrow="Aggregated count">
            <QueryState isPending={rejects.isPending} error={rejects.error} onRetry={() => { void rejects.refetch(); }}>
              <DataTable
                caption="Reject Reason Totals"
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
          </section>

          <section id="reports" className="wide-panel section-anchor">
          <Panel
            title={selectedFileId === null ? "Report Files" : `File ${selectedFileId}`}
            eyebrow={selectedFileId === null ? "Available source reports" : "Complete report"}
            action={selectedFileId !== null ? (
              <button className="secondary-button" type="button" onClick={() => {
                setRawJsonOpen(false);
                setSelectedFileId(null);
              }}>
                Back to reports
              </button>
            ) : undefined}
          >
            <div className={`report-panel-viewport ${selectedFileId !== null ? "show-detail" : "show-list"}`}>
              <div className="report-panel-view report-list-view" aria-hidden={selectedFileId !== null}>
                <QueryState isPending={files.isPending} error={files.error} onRetry={() => { void files.refetch(); }}>
                  <DataTable
                    caption="Report files"
                    columns={fileColumns}
                    rows={files.data ?? []}
                    rowKey={(row) => String(row.file_id)}
                    emptyMessage="No report files were returned for these dates."
                  />
                </QueryState>
              </div>
              <div className="report-panel-view report-detail-view" aria-hidden={selectedFileId === null}>
                <QueryState
                  isPending={fileDetail.isPending}
                  error={fileDetail.error}
                  onRetry={() => { void fileDetail.refetch(); }}
                >
                  {fileDetail.data && (
                    <div className="report-detail-content">
                      <p className="detail-name">{fileDetail.data.filename}</p>
                      <div className="detail-summary">
                        {Object.entries(fileDetail.data.summary ?? {}).map(([key, value]) => (
                          <div key={key}><span>{key.replaceAll("_", " ")}</span><strong>{display(value)}</strong></div>
                        ))}
                      </div>
                      <div className={`raw-json-disclosure ${rawJsonOpen ? "open" : ""}`}>
                        <button
                          className="raw-json-toggle"
                          type="button"
                          aria-expanded={rawJsonOpen}
                          aria-controls="raw-report-json"
                          onClick={() => setRawJsonOpen((open) => !open)}
                        >
                          <span className="disclosure-icon" aria-hidden="true">›</span>
                          Raw report JSON
                        </button>
                        <div className="raw-json-collapse" id="raw-report-json">
                          <div>
                            <pre>{JSON.stringify(fileDetail.data, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </QueryState>
              </div>
            </div>
          </Panel>
          </section>
        </div>
        </main>
      </div>
    </div>
  );
}
