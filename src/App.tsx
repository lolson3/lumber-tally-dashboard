import { useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { tallyApi } from "./api/client";
import type { DateRange, GradeMixGrouping } from "./api/types";
import { MixChart } from "./components/charts/MixChart";
import { RejectReasons } from "./components/charts/RejectReasons";
import { ProductBreakdown } from "./components/charts/ProductBreakdown";
import { DataSelectionHeader } from "./components/data-selection/DataSelectionHeader";
import { DataSelectionPanel } from "./components/data-selection/DataSelectionPanel";
import { MetricsOverview } from "./components/MetricsOverview";
import { ProductionSummary } from "./components/production/ProductionSummary";
import { ReportsPanel } from "./components/reports/ReportsPanel";
import { Sidebar } from "./components/sidebar/Sidebar";
import type { PlcOption } from "./constants/dashboard";
import { useScrollSpy } from "./hooks/useScrollSpy";
import { reportDetailQueryOptions, useReportDetailPrefetch } from "./hooks/useReportDetailPrefetch";
import { buildBoardShapes, countReportDays, latestReportDate, mergeProductionRecovery, sumAdjustedRuntimeHours, sumNullable } from "./utils/dashboardData";
import { defaultReportRange, formatReportDate, moneyFormatter, numberFormatter, previousProductionDaysRange } from "./utils/formatting";

export function App() {
  const [draftRange, setDraftRange] = useState<DateRange>(defaultReportRange);
  const [range, setRange] = useState<DateRange>(defaultReportRange);
  const [selectedPlc, setSelectedPlc] = useState<PlcOption>("Board Edger");
  const [gradeMixGrouping, setGradeMixGrouping] = useState<GradeMixGrouping>("grade");
  const [productView, setProductView] = useState<"table" | "boards">("table");
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [rawJsonOpen, setRawJsonOpen] = useState(false);
  const { activeSection, selectSection } = useScrollSpy();
  const invalidRange = Boolean(draftRange.start && draftRange.end && draftRange.start > draftRange.end);

  useQuery({ queryKey: ["health"], queryFn: ({ signal }) => tallyApi.health(signal), refetchInterval: 60_000 });
  const files = useQuery({ queryKey: ["files", selectedPlc, range], queryFn: ({ signal }) => tallyApi.files(range, signal) });
  const availableFiles = useQuery({ queryKey: ["available-files", selectedPlc], queryFn: ({ signal }) => tallyApi.files({ start: "", end: "" }, signal) });
  const production = useQuery({ queryKey: ["production-summary", selectedPlc, range], queryFn: ({ signal }) => tallyApi.productionSummary(range, signal) });
  const recovery = useQuery({ queryKey: ["recovery", selectedPlc, range], queryFn: ({ signal }) => tallyApi.recovery(range, signal) });
  const rejects = useQuery({ queryKey: ["reject-reason-totals", selectedPlc, range], queryFn: ({ signal }) => tallyApi.rejectReasonTotals(range, signal) });
  const gradeMix = useQuery({
    queryKey: ["grade-mixes", selectedPlc, range],
    queryFn: async ({ signal }) => {
      const groupings: GradeMixGrouping[] = ["grade", "width", "thickness", "length_ft"];
      const entries = await Promise.all(groupings.map(async (grouping) =>
        [grouping, await tallyApi.gradeMix(range, grouping, signal)] as const));
      return Object.fromEntries(entries) as Record<GradeMixGrouping, Awaited<ReturnType<typeof tallyApi.gradeMix>>>;
    },
  });
  const boardDimensionMix = useQuery({ queryKey: ["board-dimension-mix", selectedPlc, range], queryFn: ({ signal }) => tallyApi.boardDimensionMix(range, signal) });
  const fileDetail = useQuery({ ...reportDetailQueryOptions(selectedFileId ?? 0), enabled: selectedFileId !== null });
  const dashboardInitialLoadComplete = [production, recovery, rejects, gradeMix, boardDimensionMix]
    .every((query) => !query.isPending);
  useReportDetailPrefetch(availableFiles.data ?? [], dashboardInitialLoadComplete && availableFiles.isSuccess);

  const metrics = useMemo(() => {
    const rows = production.data ?? [];
    const days = countReportDays(files.data ?? []);
    const runtimeHours = sumAdjustedRuntimeHours(rows.map((row) => row.time_run));
    return [
      {
        label: "Run Time",
        value: `${numberFormatter.format(runtimeHours)} hrs`,
        unit: `${numberFormatter.format(days)} ${days === 1 ? "day" : "days"}`,
      },
      { label: "Input Pieces", value: numberFormatter.format(sumNullable(rows.map((row) => row.board_input_pieces))) },
      { label: "Input Volume", value: numberFormatter.format(sumNullable(rows.map((row) => row.board_input_cuft))), unit: "cu ft" },
      { label: "Total Output", value: numberFormatter.format(sumNullable(rows.map((row) => row.edger_bd_ft))), unit: "bd ft" },
      { label: "Projected Lumber Value", value: moneyFormatter.format(sumNullable(rows.map((row) => row.lumber_value))) },
    ];
  }, [files.data, production.data]);
  const productionRows = useMemo(() => mergeProductionRecovery(production.data ?? [], recovery.data ?? []), [production.data, recovery.data]);
  const boardShapes = useMemo(() => buildBoardShapes(boardDimensionMix.data ?? []), [boardDimensionMix.data]);
  const latestAvailableDate = useMemo(() => {
    const date = latestReportDate(availableFiles.data ?? []);
    return date ? formatReportDate(date) : null;
  }, [availableFiles.data]);

  const applyRange = (event: FormEvent) => {
    event.preventDefault();
    if (!invalidRange) {
      setSelectedFileId(null);
      setRange(draftRange);
    }
  };
  const showAllDates = () => {
    const allDates = { start: "", end: "" };
    setDraftRange(allDates);
    setRange(allDates);
    setSelectedFileId(null);
  };
  const showPresetDays = (days: number) => {
    const presetRange = previousProductionDaysRange(days);
    setDraftRange(presetRange);
    setRange(presetRange);
    setSelectedFileId(null);
  };
  const selectPlc = (plc: PlcOption) => {
    setSelectedPlc(plc);
    setSelectedFileId(null);
  };
  const backToReports = () => {
    setRawJsonOpen(false);
    setSelectedFileId(null);
  };

  return <div className="app-shell">
    <Sidebar activeSection={activeSection} onSelectSection={selectSection} />
    <div className="dashboard-surface">
      <DataSelectionHeader />
      <main>
        <DataSelectionPanel draftRange={draftRange} range={range} selectedPlc={selectedPlc} invalidRange={invalidRange} latestAvailableDate={latestAvailableDate} availabilityPending={availableFiles.isPending} availabilityError={availableFiles.isError} onDraftRangeChange={setDraftRange} onPlcChange={selectPlc} onApply={applyRange} onAllDates={showAllDates} onPresetDays={showPresetDays} />
        <MetricsOverview metrics={metrics} />
        <div className="dashboard-grid">
          <ProductionSummary
            rows={productionRows}
            tablePending={production.isPending || recovery.isPending} tableError={production.error ?? recovery.error}
            onRetryTable={() => { void production.refetch(); void recovery.refetch(); }}
          />
          <ProductBreakdown shapes={boardShapes} view={productView} onViewChange={setProductView} isPending={boardDimensionMix.isPending} error={boardDimensionMix.error} onRetry={() => { void boardDimensionMix.refetch(); }} />
          <section id="output&rejects" className="wide-panel paired-panel-row section-anchor">
            <MixChart grouping={gradeMixGrouping} onGroupingChange={setGradeMixGrouping} rows={gradeMix.data?.[gradeMixGrouping] ?? []} isPending={gradeMix.isPending} error={gradeMix.error} onRetry={() => { void gradeMix.refetch(); }} />
            <RejectReasons rows={rejects.data ?? []} isPending={rejects.isPending} error={rejects.error} onRetry={() => { void rejects.refetch(); }} />
          </section>
          <ReportsPanel
            files={files.data ?? []} filesPending={files.isPending} filesError={files.error} onRetryFiles={() => { void files.refetch(); }}
            selectedFileId={selectedFileId} onSelectFile={setSelectedFileId} onBack={backToReports}
            detail={fileDetail.data} detailPending={fileDetail.isPending} detailError={fileDetail.error} onRetryDetail={() => { void fileDetail.refetch(); }}
            rawJsonOpen={rawJsonOpen} onToggleRawJson={() => setRawJsonOpen((open) => !open)}
          />
        </div>
      </main>
    </div>
  </div>;
}
