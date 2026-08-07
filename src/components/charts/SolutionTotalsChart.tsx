import { useRef } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SolutionTotalOut } from "../../api/types";
import { numberFormatter } from "../../utils/formatting";
import { followChartTooltip, hideChartTooltip } from "../../utils/tooltipPosition";
import { Panel } from "../Panel";
import { QueryState } from "../QueryState";

interface Props { rows: SolutionTotalOut[]; isPending: boolean; error: Error | null; onRetry: () => void }

export function SolutionTotalsChart({ rows, isPending, error, onRetry }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  return <Panel title="Solution Totals" eyebrow="Board Count by Solution " className="chart-panel solution-chart-panel">
    <QueryState isPending={isPending} error={error} onRetry={onRetry}>{rows.length > 0 ? (
      <div className="chart-wrap" aria-label="Board count by solution number bar chart" ref={chartRef} role="img">
        <ResponsiveContainer width="100%" height="100%"><BarChart data={rows} margin={{ top: 8, right: 8, left: 8, bottom: -10 }} onMouseMove={(_, event) => followChartTooltip(chartRef.current, event.clientX, event.clientY)} onMouseLeave={() => hideChartTooltip(chartRef.current)}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="solution_number" tickLine={false} label={{ position: "insideBottom", offset: -14 }} /><YAxis tickLine={false} width={72} label={{ angle: -90, position: "insideLeft" }} />
          <Tooltip position={{ x: 0, y: 0 }} isAnimationActive={false} cursor={false} formatter={(value) => [numberFormatter.format(Number(value)), "Board count"]} labelFormatter={(value) => `Solution ${value}`} />
          <Bar dataKey="total_board_count" fill="#468f60" radius={[5, 5, 0, 0]} />
        </BarChart></ResponsiveContainer>
      </div>
    ) : <p className="empty-state">No solution totals were returned for these dates.</p>}</QueryState>
  </Panel>;
}
