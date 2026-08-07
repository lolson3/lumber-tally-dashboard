import { dashboardSectionLabels, dashboardSections, type DashboardSection } from "../../constants/dashboard";
import { SidebarTree } from "./SidebarTree";

interface SidebarProps {
  activeSection: DashboardSection | null;
  onSelectSection: (section: DashboardSection) => void;
}

export function Sidebar({ activeSection, onSelectSection }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand"><span>Lumber Tally Dashboard</span></div>
      <nav aria-label="Dashboard sections">
        {dashboardSections.map((section) => (
          <a className={`nav-link ${activeSection === section ? "active" : ""}`} href={`#${section}`} key={section} onClick={() => onSelectSection(section)}>
            {dashboardSectionLabels[section]}
          </a>
        ))}
      </nav>
      <SidebarTree />
    </aside>
  );
}
