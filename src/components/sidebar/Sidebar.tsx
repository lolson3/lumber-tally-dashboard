import { useEffect, useId, useState } from "react";
import { dashboardSectionLabels, dashboardSections, type DashboardSection } from "../../constants/dashboard";
import { SidebarTree } from "./SidebarTree";
import { currentMill } from "../../config/currentMill";

interface SidebarProps {
  activeSection: DashboardSection | null;
  onSelectSection: (section: DashboardSection) => void;
}

export function Sidebar({ activeSection, onSelectSection }: SidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const selectSection = (section: DashboardSection) => {
    onSelectSection(section);
    setMenuOpen(false);
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        {currentMill.logo
          ? <img className="brand-logo" src={currentMill.logo} alt={`${currentMill.companyName} logo`} />
          : <span className="brand-desktop-fallback">Lumber Tally Dashboard</span>}
        <span className="brand-mobile-name"><span>{currentMill.companyName}</span></span>
      </div>
      <button
        className="menu-toggle"
        type="button"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        aria-label={`${menuOpen ? "Close" : "Open"} dashboard menu`}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className="menu-toggle-lines" aria-hidden="true"><span /><span /><span /></span>
        <span>Menu</span>
      </button>
      <nav id={menuId} className={menuOpen ? "menu-open" : ""} aria-label="Dashboard sections">
        {dashboardSections.map((section) => (
          <a className={`nav-link ${activeSection === section ? "active" : ""}`} href={`#${section}`} key={section} onClick={() => selectSection(section)}>
            {dashboardSectionLabels[section]}
          </a>
        ))}
      </nav>
      <SidebarTree />
    </aside>
  );
}
