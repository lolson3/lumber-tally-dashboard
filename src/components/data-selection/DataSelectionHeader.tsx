import { currentMill } from "../../config/currentMill";

export function DataSelectionHeader() {
  return (
    <header id="data-selection" className="page-header section-anchor">
      <div>
        <p className="eyebrow typewriter-heading"><span>{currentMill.companyName}</span></p>
        <h1>Production Overview</h1>
      </div>
    </header>
  );
}
