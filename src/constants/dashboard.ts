import type { GradeMixGrouping } from "../api/types";

export const plcOptions = [
  "Board Edger", "Chopsaw", "Twin", "BakerInFeed", "Single", "Gang",
  "Swede", "Trimmer", "Debarker", "Baker", "Quad",
] as const;
export type PlcOption = (typeof plcOptions)[number];

export const dashboardSections = ["data-selection", "summary", "product-breakdown", "output&rejects", "reports"] as const;
export type DashboardSection = (typeof dashboardSections)[number];

export const dashboardSectionLabels: Record<DashboardSection, string> = {
  "data-selection": "Data Selection",
  summary: "Summary",
  "product-breakdown": "Product Breakdown",
  "output&rejects": "Output & Rejects",
  reports: "Reports",
};

export const gradeMixLabels: Record<GradeMixGrouping, string> = {
  grade: "Grade",
  thickness: "Thickness",
  width: "Width",
  length_ft: "Length Ft",
};
