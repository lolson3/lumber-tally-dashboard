import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createPortal } from "react-dom";
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
import type { DateRange, FileOut, GradeMixGrouping, ProductionSummaryRow, RecoveryRow } from "./api/types";
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

function positionTooltipAtCursor(
  tooltip: HTMLElement | null,
  clientX: number,
  clientY: number,
  origin = { left: 0, top: 0 },
) {
  if (!tooltip) return;
  tooltip.style.transform = `translate(${clientX - origin.left + 14}px, ${clientY - origin.top + 14}px)`;
}

function followChartTooltip(chart: HTMLDivElement | null, clientX: number, clientY: number) {
  if (!chart) return;
  const tooltip = chart.querySelector<HTMLElement>(".recharts-tooltip-wrapper");
  positionTooltipAtCursor(tooltip, clientX, clientY, chart.getBoundingClientRect());
  tooltip?.style.setProperty("opacity", "1", "important");
}

function hideChartTooltip(chart: HTMLDivElement | null) {
  chart?.querySelector<HTMLElement>(".recharts-tooltip-wrapper")
    ?.style.setProperty("opacity", "0", "important");
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

const dashboardSections = ["data-selection", "summary", "mix-graphs", "solutions-rejects", "reports"] as const;
type DashboardSection = (typeof dashboardSections)[number];

type ProductionDisplayRow = ProductionSummaryRow & Pick<
  RecoveryRow,
  "recovery_lrf_bf_cm" | "recovery_bf_cf" | "fiber_ratio"
>;

interface BoardShape {
  width: number;
  lengthFt: number;
  breakdown: Array<{ thickness: string; grade: string; pieces: number; boardFeet: number }>;
}

const gradeMixLabels: Record<GradeMixGrouping, string> = {
  grade: "Grade",
  thickness: "Thickness",
  width: "Width",
  length_ft: "Length Ft",
};

export function App() {
  const [draftRange, setDraftRange] = useState<DateRange>(todayRange);
  const [range, setRange] = useState<DateRange>(todayRange);
  const [selectedPlc, setSelectedPlc] = useState<(typeof plcOptions)[number]>("Board Edger");
  const [gradeMixGrouping, setGradeMixGrouping] = useState<GradeMixGrouping>("grade");
  const [productionView, setProductionView] = useState<"table" | "visual">("table");
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [rawJsonOpen, setRawJsonOpen] = useState(false);
  const [hiddenProductionColumns, setHiddenProductionColumns] = useState<Set<string>>(() => new Set());
  const [columnFilterOpen, setColumnFilterOpen] = useState(false);
  const [columnFilterPosition, setColumnFilterPosition] = useState({ top: 0, right: 0 });
  const [trunkBlockCount, setTrunkBlockCount] = useState(0);
  const [activeBoardShape, setActiveBoardShape] = useState<BoardShape | null>(null);
  const [boardTooltipPosition, setBoardTooltipPosition] = useState({ x: 0, y: 0 });
  const [activeSection, setActiveSection] = useState<DashboardSection | null>("data-selection");
  const gradeChartRef = useRef<HTMLDivElement>(null);
  const solutionChartRef = useRef<HTMLDivElement>(null);
  const columnFilterRef = useRef<HTMLDivElement>(null);
  const columnFilterMenuRef = useRef<HTMLDivElement>(null);
  const trunkFieldRef = useRef<HTMLDivElement>(null);
  const boardTooltipRef = useRef<HTMLDivElement>(null);
  const invalidRange = Boolean(draftRange.start && draftRange.end && draftRange.start > draftRange.end);

  useEffect(() => {
    let animationFrame = 0;

    const updateActiveSection = () => {
      animationFrame = 0;
      const sectionBounds = dashboardSections.map((sectionId) => {
        const section = document.getElementById(sectionId);
        if (!section) return null;

        const bounds = section.getBoundingClientRect();
        const dataSelectionEnd = sectionId === "data-selection"
          ? document.querySelector<HTMLElement>(".metric-grid")?.getBoundingClientRect().bottom
          : undefined;
        return { id: sectionId, top: bounds.top, bottom: dataSelectionEnd ?? bounds.bottom };
      }).filter((bounds): bounds is { id: DashboardSection; top: number; bottom: number } => bounds !== null);

      let currentSection: DashboardSection | null = sectionBounds[0]?.id ?? null;
      for (let index = 1; index < sectionBounds.length; index += 1) {
        const previousBounds = sectionBounds[index - 1];
        if (previousBounds.bottom <= 1) currentSection = sectionBounds[index].id;
      }

      setActiveSection(currentSection);
      if (currentSection) {
        const nextHash = `#${currentSection}`;
        if (window.location.hash !== nextHash) {
          window.history.replaceState(window.history.state, "", nextHash);
        }
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

  useEffect(() => {
    if (!columnFilterOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!columnFilterRef.current?.contains(target) && !columnFilterMenuRef.current?.contains(target)) {
        setColumnFilterOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setColumnFilterOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [columnFilterOpen]);

  useEffect(() => {
    const trunkField = trunkFieldRef.current;
    if (!trunkField) return;

    const blockHeight = 28;
    const blockGap = 3;
    const updateBlockCount = () => {
      const availableHeight = trunkField.getBoundingClientRect().height;
      setTrunkBlockCount(Math.max(0, Math.floor((availableHeight + blockGap) / (blockHeight + blockGap))));
    };
    const observer = new ResizeObserver(updateBlockCount);
    observer.observe(trunkField);
    updateBlockCount();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!columnFilterOpen) return;

    const positionMenu = () => {
      const bounds = columnFilterRef.current?.getBoundingClientRect();
      if (bounds) setColumnFilterPosition({ top: bounds.bottom + 7, right: window.innerWidth - bounds.right });
    };

    positionMenu();
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    return () => {
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
    };
  }, [columnFilterOpen]);

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
    queryKey: ["grade-mix", selectedPlc, gradeMixGrouping, range],
    queryFn: ({ signal }) => tallyApi.gradeMix(range, gradeMixGrouping, signal),
  });
  const boardDimensionMix = useQuery({
    queryKey: ["board-dimension-mix", selectedPlc, range],
    queryFn: ({ signal }) => tallyApi.boardDimensionMix(range, signal),
    enabled: productionView === "visual",
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

  const boardShapes = useMemo(() => {
    const shapes = new Map<string, BoardShape>();

    for (const row of boardDimensionMix.data ?? []) {
      if (row.width == null || row.length_ft == null) continue;
      const key = `${row.width}-${row.length_ft}`;
      const shape = shapes.get(key) ?? { width: row.width, lengthFt: row.length_ft, breakdown: [] };
      shape.breakdown.push({
        thickness: row.thickness ?? "Unknown",
        grade: row.grade ?? "Unknown",
        pieces: row.total_pieces,
        boardFeet: row.total_bd_ft,
      });
      shapes.set(key, shape);
    }

    return [...shapes.values()].sort((a, b) => a.width - b.width || a.lengthFt - b.lengthFt);
  }, [boardDimensionMix.data]);

  const maximumBoardWidth = Math.max(1, ...boardShapes.map((shape) => shape.width));
  const maximumBoardLength = Math.max(1, ...boardShapes.map((shape) => shape.lengthFt));

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
  const visibleProductionColumns = productionColumns.filter((column) => !hiddenProductionColumns.has(column.key));
  const allOptionalProductionColumnsVisible = productionColumns
    .filter((column) => column.key !== "date")
    .every((column) => !hiddenProductionColumns.has(column.key));

  function toggleProductionColumn(columnKey: string) {
    setHiddenProductionColumns((current) => {
      const next = new Set(current);
      if (next.has(columnKey)) next.delete(columnKey);
      else next.add(columnKey);
      return next;
    });
  }

  function toggleAllProductionColumns() {
    if (allOptionalProductionColumnsVisible) {
      setHiddenProductionColumns(new Set(productionColumns.filter((column) => column.key !== "date").map((column) => column.key)));
    } else {
      setHiddenProductionColumns(new Set());
    }
  }

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

  function selectNavigationSection(section: DashboardSection) {
    setActiveSection(section);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span>Log Tally Dashboard</span>
        </div>
        <nav aria-label="Dashboard sections">
          <a className={`nav-link ${activeSection === "data-selection" ? "active" : ""}`} href="#data-selection" onClick={() => selectNavigationSection("data-selection")}>Data Selection</a>
          <a className={`nav-link ${activeSection === "summary" ? "active" : ""}`} href="#summary" onClick={() => selectNavigationSection("summary")}>Summary</a>
          <a className={`nav-link ${activeSection === "mix-graphs" ? "active" : ""}`} href="#mix-graphs" onClick={() => selectNavigationSection("mix-graphs")}>Mix Graphs</a>
          <a className={`nav-link ${activeSection === "solutions-rejects" ? "active" : ""}`} href="#solutions-rejects" onClick={() => selectNavigationSection("solutions-rejects")}>Solutions &amp; Rejects</a>
          <a className={`nav-link ${activeSection === "reports" ? "active" : ""}`} href="#reports" onClick={() => selectNavigationSection("reports")}>Reports</a>
        </nav>
        <div className="sidebar-trunk-field" ref={trunkFieldRef} aria-hidden="true">
          <div className="sidebar-trunk">
            {Array.from({ length: trunkBlockCount }, (_, index) => {
              const levelFromTop = trunkBlockCount - index - 1;
              const hasBranches = levelFromTop < Math.min(9, trunkBlockCount);
              const branchWidth = 9 + levelFromTop * 5;
              return (
                <span className="trunk-block" key={index} style={{ animationDelay: `${index * 35}ms` }}>
                  {hasBranches && (
                    <>
                      <span
                        className="trunk-branch trunk-branch-left"
                        style={{ width: `${branchWidth + (levelFromTop % 2 === 0 ? 4 : 0)}px` }}
                      />
                      <span
                        className="trunk-branch trunk-branch-right"
                        style={{ width: `${branchWidth + (levelFromTop % 2 === 1 ? 5 : 0)}px` }}
                      />
                    </>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      </aside>

      <div className="dashboard-surface">
        <header id="data-selection" className="page-header section-anchor">
          <div>
            <p className="eyebrow typewriter-heading">Sequoia Forest Products</p>
            <h1>PLC Overview</h1>
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
            <div className="date-actions">
              <button className="primary-button" type="submit" disabled={invalidRange}>Apply Dates</button>
              <button className="secondary-button" type="button" onClick={showAllDates}>All Dates</button>
            </div>
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
          <Panel
            title="Production Summary"
            eyebrow="Report rows"
            action={(
              <>
              <div className="summary-actions">
              <button
                className={`summary-view-toggle ${productionView === "visual" ? "show-visual" : "show-table"}`}
                type="button"
                aria-pressed={productionView === "visual"}
                aria-label={`Switch to ${productionView === "table" ? "visual" : "table"} view`}
                onClick={() => setProductionView((view) => view === "table" ? "visual" : "table")}
              >
                <span className={productionView === "table" ? "selected" : ""}>Table</span>
                <span className={productionView === "visual" ? "selected" : ""}>Visual</span>
                <span className="summary-view-toggle-thumb" aria-hidden="true" />
              </button>
              <div className="column-filter" ref={columnFilterRef}>
                <button
                  className="column-filter-button"
                  type="button"
                  aria-expanded={columnFilterOpen}
                  aria-controls="production-column-filter"
                  onClick={() => setColumnFilterOpen((open) => !open)}
                >
                  Filter
                </button>
              </div>
              </div>
                {columnFilterOpen && createPortal(
                  <div
                    className="column-filter-menu column-filter-menu-portal"
                    id="production-column-filter"
                    ref={columnFilterMenuRef}
                    style={columnFilterPosition}
                  >
                    <button className="column-filter-toggle-all" type="button" onClick={toggleAllProductionColumns}>
                      {allOptionalProductionColumnsVisible ? "Deselect All" : "Select All"}
                    </button>
                    {productionColumns.map((column) => (
                      <label key={column.key}>
                        <input
                          type="checkbox"
                          checked={!hiddenProductionColumns.has(column.key)}
                          disabled={column.key === "date"}
                          onChange={() => toggleProductionColumn(column.key)}
                        />
                        {column.label}
                      </label>
                    ))}
                  </div>,
                  document.body,
                )}
              </>
            )}
          >
            {productionView === "table" ? (
              <QueryState
                isPending={production.isPending || recovery.isPending}
                error={production.error ?? recovery.error}
                onRetry={() => { void production.refetch(); void recovery.refetch(); }}
              >
                <DataTable
                  caption="Production Summary"
                  columns={visibleProductionColumns}
                  rows={productionRows}
                  rowKey={(row) => String(row.file_id)}
                  emptyMessage="No production rows were returned for these dates."
                />
              </QueryState>
            ) : (
              <QueryState
                isPending={boardDimensionMix.isPending}
                error={boardDimensionMix.error}
                onRetry={() => { void boardDimensionMix.refetch(); }}
              >
                {boardShapes.length > 0 ? (
                  <div className="board-visualization" aria-label="Relative board dimensions by width and length">
                    {boardShapes.map((shape) => (
                      <div
                        className="board-shape"
                        key={`${shape.width}-${shape.lengthFt}`}
                        tabIndex={0}
                        onPointerEnter={(event) => {
                          setBoardTooltipPosition({ x: event.clientX + 14, y: event.clientY + 14 });
                          setActiveBoardShape(shape);
                        }}
                        onPointerMove={(event) => positionTooltipAtCursor(boardTooltipRef.current, event.clientX, event.clientY)}
                        onPointerLeave={() => setActiveBoardShape(null)}
                        onFocus={(event) => {
                          const bounds = event.currentTarget.getBoundingClientRect();
                          setBoardTooltipPosition({ x: bounds.right + 14, y: bounds.top + 14 });
                          setActiveBoardShape(shape);
                        }}
                        onBlur={() => setActiveBoardShape(null)}
                        style={{
                          width: `${44 + (shape.width / maximumBoardWidth) * 76}px`,
                          height: `${64 + (shape.lengthFt / maximumBoardLength) * 126}px`,
                        }}
                      >
                        <span>{number.format(shape.width)} × {number.format(shape.lengthFt)}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="empty-state">No board dimension data was returned for these dates.</p>}
              </QueryState>
            )}
          </Panel>
          </section>

          <section id="mix-graphs" className="wide-panel section-anchor">
          <Panel
            title={(
              <>
                <select
                  className="grade-group-select"
                  aria-label="Group grade mix by"
                  value={gradeMixGrouping}
                  onChange={(event) => setGradeMixGrouping(event.target.value as GradeMixGrouping)}
                >
                  {(Object.entries(gradeMixLabels) as Array<[GradeMixGrouping, string]>).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>{" "}Mix
              </>
            )}
            eyebrow={`Board feet by ${gradeMixLabels[gradeMixGrouping].toLowerCase()}`}
            className="chart-panel"
          >
            <QueryState isPending={gradeMix.isPending} error={gradeMix.error} onRetry={() => { void gradeMix.refetch(); }}>
              {(gradeMix.data?.length ?? 0) > 0 ? (
                <div className="chart-wrap" aria-label={`Board feet by ${gradeMixLabels[gradeMixGrouping]} bar chart`} ref={gradeChartRef}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={gradeMix.data}
                      margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                      onMouseMove={(_, event) => followChartTooltip(gradeChartRef.current, event.clientX, event.clientY)}
                      onMouseLeave={() => hideChartTooltip(gradeChartRef.current)}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey={gradeMixGrouping} tickLine={false} />
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
                      onMouseLeave={() => hideChartTooltip(solutionChartRef.current)}
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
        {activeBoardShape && createPortal(
          <div
            className="board-shape-tooltip board-shape-tooltip-portal"
            ref={boardTooltipRef}
            role="tooltip"
            style={{ transform: `translate(${boardTooltipPosition.x}px, ${boardTooltipPosition.y}px)` }}
          >
            <strong>{number.format(activeBoardShape.width)} in × {number.format(activeBoardShape.lengthFt)} ft</strong>
            {activeBoardShape.breakdown.map((item) => (
              <div key={`${item.thickness}-${item.grade}`}>
                <span>{item.thickness} in · Grade {item.grade.replace(/^#/, "")}</span>
                <span>{number.format(item.pieces)} pieces · {number.format(item.boardFeet)} bd ft</span>
              </div>
            ))}
          </div>,
          document.body,
        )}
      </div>
    </div>
  );
}
