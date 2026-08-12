import { useMemo, useState } from "react";
import { Bar, Cell, ComposedChart, CartesianGrid, Line, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { sortBoardShapes, type BoardShape, type ProductBreakdownRow, type ProductBreakdownSort } from "../../utils/dashboardData";
import { evenChartTicks, numberFormatter, thousandsFormatter } from "../../utils/formatting";
import { Panel } from "../Panel";
import { QueryState } from "../QueryState";
import { BoardVisualization } from "../production/BoardVisualization";
import { FloatingChartTooltip } from "./FloatingChartTooltip";

interface Props {
  shapes: BoardShape[];
  view: "table" | "boards";
  onViewChange: (view: "table" | "boards") => void;
  isPending: boolean;
  error: Error | null;
  onRetry: () => void;
}

function ProductAxisTick({ x = 0, y = 0, payload }: { x?: number | string; y?: number | string; payload?: { value?: string | number } }) {
  const [width = "", length = ""] = String(payload?.value ?? "").split(" × ");
  return <text className="product-axis-tick" x={Number(x)} y={Number(y) + 12} textAnchor="middle">
    <tspan x={Number(x)} dy="0">W {width}</tspan>
    <tspan x={Number(x)} dy="14">L {length}</tspan>
  </text>;
}

export function ProductBreakdown({ shapes, view, onViewChange, isPending, error, onRetry }: Props) {
  const [sortDirection, setSortDirection] = useState<ProductBreakdownSort>("ascending");
  const paretoView = sortDirection === "pareto";
  const products = useMemo(() => {
    let cumulativePercentage = 0;
    return sortBoardShapes(shapes, sortDirection).map((shape) => {
      cumulativePercentage += shape.percentage;
      return {
        product: `${numberFormatter.format(shape.width)} in × ${numberFormatter.format(shape.lengthFt)} ft`,
        width: shape.width,
        lengthFt: shape.lengthFt,
        pieces: shape.pieces,
        boardFeet: shape.boardFeet,
        percentage: shape.percentage,
        cumulativePercentage,
      };
    });
  }, [shapes, sortDirection, paretoView]);
  const maximumPieces = Math.max(1, ...products.map((product) => product.pieces));
  const yAxisTicks = useMemo(() => evenChartTicks(maximumPieces), [maximumPieces]);
  const yAxisMaximum = yAxisTicks[yAxisTicks.length - 1];
  const action = <div className="summary-actions">
    {view === "table" && <>
      <label className="product-sort-control">Sort
      <select aria-label="Sort products" value={sortDirection} onChange={(event) => setSortDirection(event.target.value as ProductBreakdownSort)}>
        <option value="ascending">Board Size ➡</option>
        <option value="descending">Board Size ⬅</option>
        <option value="least-pieces">Pieces ➡</option>
        <option value="most-pieces">Pieces ⬅</option>
        <option value="pareto">Pareto 80/20</option>
      </select>
      </label>
    </>}
    <button className={`summary-view-toggle ${view === "boards" ? "show-boards" : ""}`} type="button" aria-pressed={view === "boards"} aria-label={`Switch to ${view === "table" ? "boards" : "bar graph"} view`} onClick={() => onViewChange(view === "table" ? "boards" : "table")}>
      <span className={view === "table" ? "selected" : ""}>Graph</span><span className={view === "boards" ? "selected" : ""}>Boards</span><span className="summary-view-toggle-thumb" aria-hidden="true" />
    </button>
  </div>;
  return <section id="product-breakdown" className="wide-panel section-anchor">
    <Panel title="Product Breakdown" eyebrow="Pieces by width and length" action={action} className="product-breakdown-panel">
      <QueryState isPending={isPending} error={error} onRetry={onRetry}>{view === "boards" ? <BoardVisualization shapes={shapes} /> : products.length ? (
        <div className="product-chart-scroll">
          <div className="product-chart" style={{ minWidth: `${Math.max(900, products.length * 60)}px` }} aria-label="Piece count by product dimensions" role="img">
            <ResponsiveContainer width="100%" height="100%"><ComposedChart data={products} barCategoryGap="28%" margin={{ top: 62, right: paretoView ? 52 : 12, left: 0, bottom: 18 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="product" tickLine={false} interval={0} height={55} tick={<ProductAxisTick />} />
              <YAxis yAxisId="pieces" tickLine={false} tickFormatter={(value) => thousandsFormatter(Number(value))} ticks={yAxisTicks} width={64} domain={[0, yAxisMaximum]} allowDecimals={false} />
              {paretoView && <YAxis yAxisId="percentage" orientation="right" domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tickFormatter={(value) => `${value}%`} width={40} />}
              <FloatingChartTooltip
                labelFormatter={(_, payload) => {
                  const product = payload[0]?.payload as ProductBreakdownRow | undefined;
                  return product ? `W ${numberFormatter.format(product.width)} in · L ${numberFormatter.format(product.lengthFt)} ft` : "";
                }}
                formatter={(_, __, item) => {
                  const product = item.payload as ProductBreakdownRow;
                  return [`${numberFormatter.format(product.pieces)} pieces · ${numberFormatter.format(product.boardFeet)} board feet`, `${numberFormatter.format(product.percentage)}%`];
                }}
              />
              <Bar yAxisId="pieces" dataKey="pieces" fill="#f5a623" maxBarSize={38} radius={[5, 5, 0, 0]} animationDuration={450}>
                {products.map((product) => <Cell key={`${product.width}-${product.lengthFt}`} fill={!paretoView || product.cumulativePercentage - product.percentage < 80 ? "#f5a623" : "#e2c7b2"} />)}
              </Bar>
              {paretoView && <>
                <ReferenceLine yAxisId="percentage" y={80} stroke="#c84f00" strokeDasharray="6 4" label={{ value: "80%", position: "insideTopRight", fill: "#c84f00" }} />
                <Line yAxisId="percentage" type="monotone" dataKey="cumulativePercentage" name="Cumulative" stroke="#7a3210" strokeWidth={3} dot={{ r: 4 }} isAnimationActive />
              </>}
            </ComposedChart></ResponsiveContainer>
            <div className="product-label-overlay" style={{ gridTemplateColumns: `repeat(${products.length}, minmax(0, 1fr))` }} aria-hidden="true">
              {products.map((product, index) => <div className="product-label-slot" key={index}>
                <span className="product-bar-label" style={{ bottom: `${product.pieces / yAxisMaximum * 100}%` }}>{numberFormatter.format(product.percentage)}%</span>
              </div>)}
            </div>
          </div>
        </div>
      ) : <p className="empty-state">No product dimension data was returned for these dates.</p>}</QueryState>
    </Panel>
  </section>;
}
