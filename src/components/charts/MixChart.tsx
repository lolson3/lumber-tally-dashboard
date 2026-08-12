import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { GradeMixGrouping, GradeMixRow } from "../../api/types";
import { gradeMixLabels } from "../../constants/dashboard";
import { numberFormatter, thousandsFormatter } from "../../utils/formatting";
import { sortMixRows } from "../../utils/dashboardData";
import { Panel } from "../Panel";
import { QueryState } from "../QueryState";
import { FloatingChartTooltip } from "./FloatingChartTooltip";

interface Props {
  grouping: GradeMixGrouping;
  onGroupingChange: (grouping: GradeMixGrouping) => void;
  rows: GradeMixRow[];
  isPending: boolean;
  error: Error | null;
  onRetry: () => void;
}

export function MixChart({ grouping, onGroupingChange, rows, isPending, error, onRetry }: Props) {
  const label = gradeMixLabels[grouping];
  const sortedRows = useMemo(() => sortMixRows(rows, grouping), [rows, grouping]);
  const title = <><select className="grade-group-select" aria-label="Group grade mix by" value={grouping} onChange={(event) => onGroupingChange(event.target.value as GradeMixGrouping)}>
    {(Object.entries(gradeMixLabels) as Array<[GradeMixGrouping, string]>).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
  </select>{" "}Mix</>;
  return <Panel title={title} eyebrow={`Board feet by ${label.toLowerCase()}`} className="chart-panel mix-chart-panel">
    <QueryState isPending={isPending} error={error} onRetry={onRetry}>{rows.length > 0 ? (
      <div className="chart-wrap" aria-label={`Board feet by ${label} bar chart`} role="img">
        <ResponsiveContainer width="100%" height="100%"><BarChart data={sortedRows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey={grouping} tickLine={false} /><YAxis tickLine={false} tickFormatter={(value) => thousandsFormatter(Number(value))} width={72} />
          <FloatingChartTooltip formatter={(value) => [numberFormatter.format(Number(value)), "Board feet"]} />
          <Bar dataKey="total_bd_ft" fill="#f5a623" radius={[5, 5, 0, 0]} />
        </BarChart></ResponsiveContainer>
      </div>
    ) : <p className="empty-state">No grade-mix data was returned for these dates.</p>}</QueryState>
  </Panel>;
}
