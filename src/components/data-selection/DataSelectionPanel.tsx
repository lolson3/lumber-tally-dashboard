import type { FormEvent } from "react";
import type { DateRange } from "../../api/types";
import { plcOptions, type PlcOption } from "../../constants/dashboard";

interface DataSelectionPanelProps {
  draftRange: DateRange;
  range: DateRange;
  selectedPlc: PlcOption;
  invalidRange: boolean;
  latestAvailableDate: string | null;
  availabilityPending: boolean;
  availabilityError: boolean;
  onDraftRangeChange: (range: DateRange) => void;
  onPlcChange: (plc: PlcOption) => void;
  onApply: (event: FormEvent) => void;
  onAllDates: () => void;
  onPresetDays: (days: number) => void;
}

export function DataSelectionPanel(props: DataSelectionPanelProps) {
  const { draftRange, range, selectedPlc, invalidRange, latestAvailableDate, availabilityPending, availabilityError, onDraftRangeChange, onPlcChange, onApply, onAllDates, onPresetDays } = props;
  return (
    <section className="filter-bar" aria-labelledby="date-filter-heading">
        <div className="filter-heading">
          <p className="eyebrow">Data selection</p>
          <h2 id="date-filter-heading">Choose Report Dates</h2>
          <span className={`data-availability ${availabilityPending ? "is-pending" : latestAvailableDate && !availabilityError ? "is-available" : "is-unavailable"}`} role="status">
            <span className="data-availability-dot" aria-hidden="true" />
            {availabilityPending ? "Checking latest data…" : latestAvailableDate && !availabilityError ? `Last data: ${latestAvailableDate}` : "No data available"}
          </span>
        </div>
        <form onSubmit={onApply}>
          <label className="plc-control" htmlFor="plc-select">PLC
            <select className="window-input" id="plc-select" value={selectedPlc} onChange={(event) => onPlcChange(event.target.value as PlcOption)}>
              {plcOptions.map((plc) => <option key={plc} value={plc} disabled={plc !== "Board Edger"}>{plc}</option>)}
            </select>
          </label>
          <label>Start date<input className="window-input" type="date" value={draftRange.start} max={draftRange.end || undefined} onChange={(event) => onDraftRangeChange({ ...draftRange, start: event.target.value })} /></label>
          <label>End date<input className="window-input" type="date" value={draftRange.end} min={draftRange.start || undefined} onChange={(event) => onDraftRangeChange({ ...draftRange, end: event.target.value })} /></label>
          <div className="date-actions">
            <button className="primary-button" type="submit" disabled={invalidRange}>Apply Dates</button>
            <button className="secondary-button" type="button" onClick={onAllDates}>All Dates</button>
            {[7, 30, 90].map((days) => <button className="secondary-button date-preset-button" type="button" key={days} onClick={() => onPresetDays(days)}>{days} Days</button>)}
          </div>
        </form>
        {invalidRange && <p className="validation-message" role="alert">Start date must be on or before end date.</p>}
        <p className="filter-note">Showing {range.start || "earliest available"} through {range.end || "latest available"}.</p>
    </section>
  );
}
