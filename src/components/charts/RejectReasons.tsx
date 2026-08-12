import type { RejectReasonTotalOut } from "../../api/types";
import { numberFormatter } from "../../utils/formatting";
import { DataTable } from "../DataTable";
import { Panel } from "../Panel";
import { QueryState } from "../QueryState";

interface Props {
  rows: RejectReasonTotalOut[];
  isPending: boolean;
  error: Error | null;
  onRetry: () => void;
}

export function RejectReasons({ rows, isPending, error, onRetry }: Props) {
  return <Panel title="Reject Reasons" eyebrow="Aggregated count" className="reject-reasons-panel">
    <QueryState isPending={isPending} error={error} onRetry={onRetry}>
      <DataTable
        caption="Reject Reason Totals"
        columns={[
          { key: "reason", label: "Reason", render: (row: RejectReasonTotalOut) => row.reason },
          { key: "count", label: "Count", numeric: true, render: (row: RejectReasonTotalOut) => numberFormatter.format(row.total_count) },
        ]}
        rows={rows}
        rowKey={(row) => row.reason}
        emptyMessage="No reject reasons were returned for these dates."
      />
    </QueryState>
  </Panel>;
}
