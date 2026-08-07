import { useMemo, useRef } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GradeMixGrouping, GradeMixRow } from "../../api/types";
import { gradeMixLabels } from "../../constants/dashboard";
import { numberFormatter } from "../../utils/formatting";
import { sortMixRows } from "../../utils/dashboardData";
import { followChartTooltip, hideChartTooltip } from "../../utils/tooltipPosition";
import { Panel } from "../Panel";
import { QueryState } from "../QueryState";

interface Props {
  grouping: GradeMixGrouping;
  onGroupingChange: (grouping: GradeMixGrouping) => void;
  rows: GradeMixRow[];
  isPending: boolean;
  error: Error | null;
  onRetry: () => void;
}

export function MixChart({ grouping, onGroupingChange, rows, isPending, error, onRetry }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const label = gradeMixLabels[grouping];
  const sortedRows = useMemo(() => sortMixRows(rows, grouping), [rows, grouping]);
  const title = <><select className="grade-group-select" aria-label="Group grade mix by" value={grouping} onChange={(event) => onGroupingChange(event.target.value as GradeMixGrouping)}>
    {(Object.entries(gradeMixLabels) as Array<[GradeMixGrouping, string]>).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
  </select>{" "}Mix</>;
  return <section id="mix-graphs" className="wide-panel section-anchor"><Panel title={title} eyebrow={`Board feet by ${label.toLowerCase()}`} className="chart-panel">
    <QueryState isPending={isPending} error={error} onRetry={onRetry}>{rows.length > 0 ? (
      <div className="chart-wrap" aria-label={`Board feet by ${label} bar chart`} ref={chartRef} role="img">
        <ResponsiveContainer width="100%" height="100%"><BarChart data={sortedRows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }} onMouseMove={(_, event) => followChartTooltip(chartRef.current, event.clientX, event.clientY)} onMouseLeave={() => hideChartTooltip(chartRef.current)}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey={grouping} tickLine={false} /><YAxis tickLine={false} width={72} />
          <Tooltip position={{ x: 0, y: 0 }} isAnimationActive={false} cursor={false} formatter={(value) => [numberFormatter.format(Number(value)), "Board feet"]} />
          <Bar dataKey="total_bd_ft" fill="#f5a623" radius={[5, 5, 0, 0]} />
        </BarChart></ResponsiveContainer>
      </div>
    ) : <p className="empty-state">No grade-mix data was returned for these dates.</p>}</QueryState>
  </Panel></section>;
}
