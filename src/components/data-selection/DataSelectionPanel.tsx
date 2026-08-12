import type { FormEvent } from "react";
import type { DateRange } from "../../api/types";
import { plcOptions, type PlcOption } from "../../constants/dashboard";

interface DataSelectionPanelProps {
  draftRange: DateRange;
  range: DateRange;
  selectedPlc: PlcOption;
  invalidRange: boolean;
  isRefreshing: boolean;
  onDraftRangeChange: (range: DateRange) => void;
  onPlcChange: (plc: PlcOption) => void;
  onApply: (event: FormEvent) => void;
  onAllDates: () => void;
}

export function DataSelectionPanel(props: DataSelectionPanelProps) {
  const { draftRange, range, selectedPlc, invalidRange, isRefreshing, onDraftRangeChange, onPlcChange, onApply, onAllDates } = props;
  const changeStartDate = (start: string) => {
    const endWasLinked = !draftRange.end || draftRange.end === draftRange.start;
    const endPrecedesStart = Boolean(start && draftRange.end && draftRange.end < start);
    onDraftRangeChange({ start, end: endWasLinked || endPrecedesStart ? start : draftRange.end });
  };
  return (
    <section className="filter-bar" aria-labelledby="date-filter-heading">
        <div><p className="eyebrow">Data selection</p><h2 id="date-filter-heading">Choose Report Dates</h2></div>
        <form onSubmit={onApply}>
          <label className="plc-control" htmlFor="plc-select">PLC
            <select className="window-input" id="plc-select" value={selectedPlc} onChange={(event) => onPlcChange(event.target.value as PlcOption)}>
              {plcOptions.map((plc) => <option key={plc} value={plc} disabled={plc !== "Board Edger"}>{plc}</option>)}
            </select>
          </label>
          <label>Start date<input className="window-input" type="date" value={draftRange.start} max={draftRange.end || undefined} onChange={(event) => changeStartDate(event.target.value)} /></label>
          <label>End date<input className="window-input" type="date" value={draftRange.end} min={draftRange.start || undefined} onChange={(event) => onDraftRangeChange({ ...draftRange, end: event.target.value })} /></label>
          <div className="date-actions">
            <button className="primary-button" type="submit" disabled={invalidRange}>Apply Dates</button>
            <button className="secondary-button" type="button" onClick={onAllDates}>All Dates</button>
          </div>
        </form>
        {invalidRange && <p className="validation-message" role="alert">Start date must be on or before end date.</p>}
        <p className="filter-note">Showing {range.start || "earliest available"} through {range.end || "latest available"}.{isRefreshing && <span aria-live="polite"> Refreshing…</span>}</p>
    </section>
  );
}
