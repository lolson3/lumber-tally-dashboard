import type { DateRange } from "../api/types";

export const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
export const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

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
