import { currentMill, demoMode } from "../../config/currentMill";

export function DataSelectionHeader() {
  return (
    <header id="data-selection" className="page-header section-anchor">
      <div>
        <p className="eyebrow typewriter-heading"><span>{currentMill.companyName}</span></p>
        <div className="page-title-row">
          <h1>Production Overview</h1>
          {demoMode && <span className="demo-badge">Demo data</span>}
        </div>
      </div>
    </header>
  );
}
