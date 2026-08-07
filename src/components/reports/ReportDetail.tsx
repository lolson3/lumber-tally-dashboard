import type { FileDetail } from "../../api/types";
import { displayValue } from "../../utils/formatting";

interface Props { file: FileDetail; rawJsonOpen: boolean; onToggleRawJson: () => void }

export function ReportDetail({ file, rawJsonOpen, onToggleRawJson }: Props) {
  return <div className="report-detail-content">
    <p className="detail-name">{file.filename}</p>
    <div className="detail-summary">{Object.entries(file.summary ?? {}).map(([key, value]) => <div key={key}><span>{key.replaceAll("_", " ")}</span><strong>{displayValue(value)}</strong></div>)}</div>
    <div className={`raw-json-disclosure ${rawJsonOpen ? "open" : ""}`}>
      <button className="raw-json-toggle" type="button" aria-expanded={rawJsonOpen} aria-controls="raw-report-json" onClick={onToggleRawJson}><span className="disclosure-icon" aria-hidden="true">›</span>Raw report JSON</button>
      <div className="raw-json-collapse" id="raw-report-json"><div><pre>{JSON.stringify(file, null, 2)}</pre></div></div>
    </div>
  </div>;
}
