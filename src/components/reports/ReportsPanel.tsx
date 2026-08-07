import type { FileDetail, FileOut } from "../../api/types";
import { Panel } from "../Panel";
import { QueryState } from "../QueryState";
import { ReportDetail } from "./ReportDetail";
import { ReportList } from "./ReportList";

interface Props {
  files: FileOut[];
  filesPending: boolean;
  filesError: Error | null;
  onRetryFiles: () => void;
  selectedFileId: number | null;
  onSelectFile: (id: number) => void;
  onBack: () => void;
  detail?: FileDetail;
  detailPending: boolean;
  detailError: Error | null;
  onRetryDetail: () => void;
  rawJsonOpen: boolean;
  onToggleRawJson: () => void;
}

export function ReportsPanel(props: Props) {
  const action = props.selectedFileId !== null ? <button className="secondary-button" type="button" onClick={props.onBack}>Back to reports</button> : undefined;
  return <section id="reports" className="wide-panel section-anchor"><Panel title={props.selectedFileId === null ? "Report Files" : `File ${props.selectedFileId}`} eyebrow={props.selectedFileId === null ? "Available source reports" : "Complete report"} action={action}>
    <div className={`report-panel-viewport ${props.selectedFileId !== null ? "show-detail" : "show-list"}`}>
      <div className="report-panel-view report-list-view" aria-hidden={props.selectedFileId !== null}><QueryState isPending={props.filesPending} error={props.filesError} onRetry={props.onRetryFiles}><ReportList files={props.files} onSelect={props.onSelectFile} /></QueryState></div>
      <div className="report-panel-view report-detail-view" aria-hidden={props.selectedFileId === null}><QueryState isPending={props.detailPending} error={props.detailError} onRetry={props.onRetryDetail}>{props.detail && <ReportDetail file={props.detail} rawJsonOpen={props.rawJsonOpen} onToggleRawJson={props.onToggleRawJson} />}</QueryState></div>
    </div>
  </Panel></section>;
}
