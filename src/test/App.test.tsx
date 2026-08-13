import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";

const api = vi.hoisted(() => ({
  health: vi.fn(), files: vi.fn(), file: vi.fn(), productionSummary: vi.fn(), recovery: vi.fn(),
  solutionTotals: vi.fn(), rejectReasonTotals: vi.fn(), gradeMix: vi.fn(), boardDimensionMix: vi.fn(),
}));

vi.mock("../api/client", () => ({ tallyApi: api }));

const report = {
  file_id: 7,
  filename: "tally.txt",
  filename_date: "2026-08-01",
  report_datetime: "2026-08-01 12:00:00",
};

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  return render(<QueryClientProvider client={client}><App /></QueryClientProvider>);
}

beforeEach(() => {
  api.health.mockResolvedValue({ status: "ok" });
  api.files.mockResolvedValue([report]);
  api.productionSummary.mockResolvedValue([{ ...report, time_run: "01:30:00", board_input_pieces: 10, board_input_cuft: 20, edger_bd_ft: 30, lumber_value: 40 }]);
  api.recovery.mockResolvedValue([{ file_id: 7, report_datetime: report.report_datetime, recovery_bf_cf: 9.5 }]);
  api.solutionTotals.mockResolvedValue([{ solution_number: 1, total_board_count: 4 }]);
  api.rejectReasonTotals.mockResolvedValue([{ reason: "No Decision", total_count: 2 }]);
  api.gradeMix.mockResolvedValue([{ grade: "#2", total_pieces: 3, total_bd_ft: 9 }]);
  api.boardDimensionMix.mockResolvedValue([{ width: 4, length_ft: 6, thickness: "5/8", grade: "#2", total_pieces: 3, total_bd_ft: 9 }]);
  api.file.mockResolvedValue({ ...report, summary: { board_input_pieces: 10 }, solutions: [], reject_reasons: [], detail_lines: [] });
});

describe("dashboard workflows", () => {
  it("loads data, validates dates, filters columns, and switches visual mode", async () => {
    const user = userEvent.setup();
    renderApp();
    const productionTable = await screen.findByRole("table", { name: "Production Summary" });
    expect(screen.getAllByText("$40.00")).toHaveLength(2);
    expect(screen.queryByRole("heading", { name: "Solution Totals" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reject Reasons" })).toBeInTheDocument();
    expect(screen.getByLabelText("Board feet by Grade bar chart")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Product Breakdown" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Last data: 8/1/2026");
    expect(screen.getByLabelText("Piece count by product dimensions")).toBeInTheDocument();
    expect(screen.getByLabelText("Sort products")).toHaveValue("ascending");
    expect(screen.getByRole("option", { name: "Board Size ➡" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Board Size ⬅" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Pieces ➡" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Pieces ⬅" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Pareto 80/20" })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Sort products"), "pareto");
    expect(screen.getByLabelText("Sort products")).toHaveValue("pareto");
    await user.selectOptions(screen.getByLabelText("Sort products"), "ascending");
    await waitFor(() => expect(api.gradeMix).toHaveBeenCalledTimes(4));
    const mixGrouping = screen.getByLabelText("Group grade mix by");
    await user.selectOptions(mixGrouping, "width");
    expect(api.gradeMix).toHaveBeenCalledTimes(4);
    expect(mixGrouping.closest(".panel")?.querySelector(".loading-state")).toBeNull();
    const daysCard = screen.getByText("Run Time").closest("article");
    expect(daysCard?.querySelector("strong")).toHaveTextContent("0.5 hrs");
    expect(screen.getByText("Total Output")).toBeInTheDocument();
    expect(daysCard?.querySelector("span")).toHaveTextContent("1 day");
    expect(productionTable.querySelectorAll("th")).toHaveLength(7);
    expect(Array.from(productionTable.querySelectorAll("th"), (header) => header.textContent)).toEqual([
      "Report date", "Run time", "Run time %", "Input pieces", "Edger bd ft", "Blank passes", "Lumber value",
    ]);
    expect(productionTable).toHaveTextContent("00:30:00");
    expect(productionTable).toHaveTextContent("5.26%");

    const start = screen.getByLabelText(/Start date/i);
    const end = screen.getByLabelText(/End date/i);
    await user.clear(start);
    await user.type(start, "2026-07-15");
    expect(end).toHaveValue("2026-07-15");
    await user.clear(start);
    await user.type(start, "2026-08-31");
    await user.clear(end);
    await user.type(end, "2026-08-01");
    expect(screen.getByRole("button", { name: "Apply Dates" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Start date must be on or before end date");

    await user.click(screen.getByRole("button", { name: "Filter" }));
    expect(screen.getByRole("button", { name: "Select All" })).toBeInTheDocument();
    expect(screen.getByLabelText("Run time")).toBeChecked();
    expect(screen.getByLabelText("Run time %")).toBeChecked();
    expect(screen.getByLabelText("Input pieces")).toBeChecked();
    expect(screen.getByLabelText("Edger bd ft")).toBeChecked();
    expect(screen.getByLabelText("Lumber value")).toBeChecked();
    expect(screen.getByLabelText("Report date")).toBeChecked();
    expect(screen.getByLabelText("Start time")).not.toBeChecked();
    expect(screen.getByLabelText("Blank passes")).toBeChecked();
    expect(screen.getByLabelText("Blank pass bd ft")).not.toBeChecked();
    await user.click(screen.getByLabelText("Input pieces"));
    expect(screen.queryByRole("columnheader", { name: "Input pieces" })).not.toBeInTheDocument();
    await user.click(document.body);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Select All" })).not.toBeInTheDocument());

    const viewToggle = screen.getByRole("button", { name: "Switch to boards view" });
    await user.click(viewToggle);
    expect(viewToggle).toHaveClass("show-boards");
    expect(screen.getByText("Boards", { selector: ".selected" })).toBeInTheDocument();
    expect(await screen.findByLabelText("Relative board dimensions by width and length")).toBeInTheDocument();
    expect(screen.getByText("100%", { selector: ".board-shape-percentage" })).toBeInTheDocument();
  });

  it("opens a complete report and its raw JSON, then returns to the list", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(await screen.findByRole("button", { name: "View report" }));
    await waitFor(() => expect(screen.getAllByText("tally.txt")).toHaveLength(2));
    const rawJson = screen.getByRole("button", { name: /Raw report JSON/ });
    await user.click(rawJson);
    expect(rawJson).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("button", { name: "Back to reports" }));
    expect(screen.getByRole("table", { name: "Report files" })).toBeInTheDocument();
  });

  it("has no automatically detectable serious accessibility violations", async () => {
    const { container } = renderApp();
    await screen.findByRole("table", { name: "Production Summary" });
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
  });
});
