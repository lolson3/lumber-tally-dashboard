import type { DateRange } from "../api/types";

export const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const compactThousandsFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0, useGrouping: false });
export const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function thousandsFormatter(value: number) {
  if (Math.abs(value) < 1_000) return numberFormatter.format(value);
  if (Math.abs(value) >= 1_000_000) return `${compactThousandsFormatter.format(value / 1_000_000)}m`;
  return `${compactThousandsFormatter.format(value / 1_000)}k`;
}

export function evenChartTicks(maximum: number, intervalCount = 5) {
  if (!Number.isFinite(maximum) || maximum <= 0) return [0, 1];
  const roughStep = maximum / intervalCount;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = multiplier * magnitude;
  const axisMaximum = Math.ceil(maximum / step) * step;
  return Array.from({ length: Math.round(axisMaximum / step) + 1 }, (_, index) => index * step);
}

export function todayRange(): DateRange {
  const today = new Date().toLocaleDateString("en-CA");
  return { start: today, end: today };
}

export function displayValue(
  value: string | number | null | undefined,
  formatter = numberFormatter,
) {
  if (value === null || value === undefined || value === "") return "—";
  return typeof value === "number" ? formatter.format(value) : value;
}
