import { useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { tallyApi } from "./api/client";
import type { DateRange, GradeMixGrouping } from "./api/types";
import { MixChart } from "./components/charts/MixChart";
import { SolutionsRejects } from "./components/charts/SolutionsRejects";
import { DataSelectionHeader } from "./components/data-selection/DataSelectionHeader";
import { DataSelectionPanel } from "./components/data-selection/DataSelectionPanel";
import { MetricsOverview } from "./components/MetricsOverview";
import { ProductionSummary } from "./components/production/ProductionSummary";
import { ReportsPanel } from "./components/reports/ReportsPanel";
import { Sidebar } from "./components/sidebar/Sidebar";
import type { PlcOption } from "./constants/dashboard";
import { useScrollSpy } from "./hooks/useScrollSpy";
import { buildBoardShapes, mergeProductionRecovery, sumNullable } from "./utils/dashboardData";
import { moneyFormatter, numberFormatter, todayRange } from "./utils/formatting";

export function App() {
  const [draftRange, setDraftRange] = useState<DateRange>(todayRange);
  const [range, setRange] = useState<DateRange>(todayRange);
  const [selectedPlc, setSelectedPlc] = useState<PlcOption>("Board Edger");
  const [gradeMixGrouping, setGradeMixGrouping] = useState<GradeMixGrouping>("grade");
  const [productionView, setProductionView] = useState<"table" | "visual">("table");
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [rawJsonOpen, setRawJsonOpen] = useState(false);
  const { activeSection, selectSection } = useScrollSpy();
  const invalidRange = Boolean(draftRange.start && draftRange.end && draftRange.start > draftRange.end);

  useQuery({ queryKey: ["health"], queryFn: ({ signal }) => tallyApi.health(signal), refetchInterval: 60_000 });
  const files = useQuery({ queryKey: ["files", selectedPlc, range], queryFn: ({ signal }) => tallyApi.files(range, signal) });
  const production = useQuery({ queryKey: ["production-summary", selectedPlc, range], queryFn: ({ signal }) => tallyApi.productionSummary(range, signal) });
  const recovery = useQuery({ queryKey: ["recovery", selectedPlc, range], queryFn: ({ signal }) => tallyApi.recovery(range, signal) });
  const solutions = useQuery({ queryKey: ["solution-totals", selectedPlc, range], queryFn: ({ signal }) => tallyApi.solutionTotals(range, signal) });
  const rejects = useQuery({ queryKey: ["reject-reason-totals", selectedPlc, range], queryFn: ({ signal }) => tallyApi.rejectReasonTotals(range, signal) });
  const gradeMix = useQuery({ queryKey: ["grade-mix", selectedPlc, gradeMixGrouping, range], queryFn: ({ signal }) => tallyApi.gradeMix(range, gradeMixGrouping, signal) });
  const boardDimensionMix = useQuery({ queryKey: ["board-dimension-mix", selectedPlc, range], queryFn: ({ signal }) => tallyApi.boardDimensionMix(range, signal), enabled: productionView === "visual" });
  const fileDetail = useQuery({ queryKey: ["file-detail", selectedFileId], queryFn: ({ signal }) => tallyApi.file(selectedFileId!, signal), enabled: selectedFileId !== null });

  const metrics = useMemo(() => {
    const rows = production.data ?? [];
    return [
      { label: "Reports", value: numberFormatter.format(files.data?.length ?? 0) },
      { label: "Input Pieces", value: numberFormatter.format(sumNullable(rows.map((row) => row.board_input_pieces))) },
      { label: "Input Volume", value: numberFormatter.format(sumNullable(rows.map((row) => row.board_input_cuft))), unit: "cu ft" },
      { label: "Edger Output", value: numberFormatter.format(sumNullable(rows.map((row) => row.edger_bd_ft))), unit: "bd ft" },
      { label: "Projected Lumber Value", value: moneyFormatter.format(sumNullable(rows.map((row) => row.lumber_value))) },
    ];
  }, [files.data, production.data]);
  const productionRows = useMemo(() => mergeProductionRecovery(production.data ?? [], recovery.data ?? []), [production.data, recovery.data]);
  const boardShapes = useMemo(() => buildBoardShapes(boardDimensionMix.data ?? []), [boardDimensionMix.data]);
  const isRefreshing = [files, production, recovery, solutions, rejects, gradeMix].some((query) => query.isFetching);

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
        <DataSelectionPanel draftRange={draftRange} range={range} selectedPlc={selectedPlc} invalidRange={invalidRange} isRefreshing={isRefreshing} onDraftRangeChange={setDraftRange} onPlcChange={selectPlc} onApply={applyRange} onAllDates={showAllDates} />
        <MetricsOverview metrics={metrics} />
        <div className="dashboard-grid">
          <ProductionSummary
            view={productionView} onViewChange={setProductionView} rows={productionRows} shapes={boardShapes}
            tablePending={production.isPending || recovery.isPending} tableError={production.error ?? recovery.error}
            visualPending={boardDimensionMix.isPending} visualError={boardDimensionMix.error}
            onRetryTable={() => { void production.refetch(); void recovery.refetch(); }} onRetryVisual={() => { void boardDimensionMix.refetch(); }}
          />
          <MixChart grouping={gradeMixGrouping} onGroupingChange={setGradeMixGrouping} rows={gradeMix.data ?? []} isPending={gradeMix.isPending} error={gradeMix.error} onRetry={() => { void gradeMix.refetch(); }} />
          <SolutionsRejects
            solutions={solutions.data ?? []} solutionsPending={solutions.isPending} solutionsError={solutions.error} onRetrySolutions={() => { void solutions.refetch(); }}
            rejects={rejects.data ?? []} rejectsPending={rejects.isPending} rejectsError={rejects.error} onRetryRejects={() => { void rejects.refetch(); }}
          />
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
