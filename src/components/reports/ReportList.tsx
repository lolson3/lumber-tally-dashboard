import type { FileOut } from "../../api/types";
import { DataTable, type Column } from "../DataTable";

export function ReportList({ files, onSelect }: { files: FileOut[]; onSelect: (id: number) => void }) {
  const columns: Array<Column<FileOut>> = [
    { key: "id", label: "ID", numeric: true, render: (row) => row.file_id },
    { key: "filename", label: "Filename", render: (row) => row.filename },
    { key: "filedate", label: "File date", render: (row) => row.filename_date },
    { key: "reportdate", label: "Report date", render: (row) => row.report_datetime },
    { key: "actions", label: "Details", render: (row) => <button className="text-button" type="button" onClick={() => onSelect(row.file_id)}>View report</button> },
  ];
  return <DataTable caption="Report files" columns={columns} rows={files} rowKey={(row) => String(row.file_id)} emptyMessage="No report files were returned for these dates." />;
}
