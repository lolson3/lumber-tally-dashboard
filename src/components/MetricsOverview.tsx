interface Metric { label: string; value: string; unit?: string }

export function MetricsOverview({ metrics }: { metrics: Metric[] }) {
  return <section className="metric-grid" aria-label="Production overview">{metrics.map((metric) => (
    <article className="metric-card" key={metric.label}><p>{metric.label}</p><strong>{metric.value}</strong>{metric.unit && <span>{metric.unit}</span>}</article>
  ))}</section>;
}
