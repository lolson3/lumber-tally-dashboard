import type { RejectReasonTotalOut, SolutionTotalOut } from "../../api/types";
import { numberFormatter } from "../../utils/formatting";
import { DataTable } from "../DataTable";
import { Panel } from "../Panel";
import { QueryState } from "../QueryState";
import { SolutionTotalsChart } from "./SolutionTotalsChart";

interface Props {
  solutions: SolutionTotalOut[];
  solutionsPending: boolean;
  solutionsError: Error | null;
  onRetrySolutions: () => void;
  rejects: RejectReasonTotalOut[];
  rejectsPending: boolean;
  rejectsError: Error | null;
  onRetryRejects: () => void;
}

export function SolutionsRejects(props: Props) {
  return <section id="solutions-rejects" className="wide-panel paired-panel-row section-anchor">
    <SolutionTotalsChart rows={props.solutions} isPending={props.solutionsPending} error={props.solutionsError} onRetry={props.onRetrySolutions} />
    <Panel title="Reject Reasons" eyebrow="Aggregated count"><QueryState isPending={props.rejectsPending} error={props.rejectsError} onRetry={props.onRetryRejects}>
      <DataTable caption="Reject Reason Totals" columns={[{ key: "reason", label: "Reason", render: (row: RejectReasonTotalOut) => row.reason }, { key: "count", label: "Count", numeric: true, render: (row: RejectReasonTotalOut) => numberFormatter.format(row.total_count) }]} rows={props.rejects} rowKey={(row) => row.reason} emptyMessage="No reject reasons were returned for these dates." />
    </QueryState></Panel>
  </section>;
}
