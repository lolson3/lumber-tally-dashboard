import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataTable } from "../../components/DataTable";

describe("DataTable", () => {
  const columns = [
    { key: "name", label: "Name", render: (row: { name: string; value: number }) => row.name },
    { key: "value", label: "Value", numeric: true, render: (row: { name: string; value: number }) => row.value },
  ];

  it("renders an accessible table and numeric columns", () => {
    render(<DataTable caption="Results" columns={columns} rows={[{ name: "A", value: 4 }]} rowKey={(row) => row.name} emptyMessage="Empty" />);
    expect(screen.getByRole("table", { name: "Results" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "4" })).toHaveClass("numeric");
  });

  it("renders the supplied empty state", () => {
    render(<DataTable caption="Results" columns={columns} rows={[]} rowKey={(row) => row.name} emptyMessage="Nothing returned" />);
    expect(screen.getByText("Nothing returned")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
