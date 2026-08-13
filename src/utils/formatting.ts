import type { DateRange } from "../api/types";

export const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
export const PRODUCTION_TIME_ZONE = "America/Los_Angeles";
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

export function defaultReportRange(referenceDate = new Date()): DateRange {
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: PRODUCTION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(referenceDate);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(dateParts.find((entry) => entry.type === type)?.value);
  const pacificCalendarDate = Date.UTC(part("year"), part("month") - 1, part("day"));
  const previousDay = new Date(pacificCalendarDate - 86_400_000).toISOString().slice(0, 10);
  return { start: previousDay, end: previousDay };
}

export function formatReportDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return `${month}/${day}/${year}`;
}

export function displayValue(
  value: string | number | null | undefined,
  formatter = numberFormatter,
) {
  if (value === null || value === undefined || value === "") return "—";
  return typeof value === "number" ? formatter.format(value) : value;
}
