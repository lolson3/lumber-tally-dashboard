import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QueryState } from "../../components/QueryState";

describe("QueryState", () => {
  it("renders loading, error, and success states", () => {
    const { rerender } = render(<QueryState isPending error={null}>content</QueryState>);
    expect(screen.getByText("Loading data…")).toBeInTheDocument();
    rerender(<QueryState isPending={false} error={new Error("offline")}>content</QueryState>);
    expect(screen.getByRole("alert")).toHaveTextContent("offline");
    rerender(<QueryState isPending={false} error={null}>content</QueryState>);
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("calls the retry handler", async () => {
    const retry = vi.fn();
    render(<QueryState isPending={false} error={new Error("failed")} onRetry={retry}>content</QueryState>);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
