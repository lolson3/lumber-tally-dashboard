import { useEffect, useRef, useState } from "react";
import { dashboardSections, type DashboardSection } from "../constants/dashboard";

export function useScrollSpy() {
  const [activeSection, setActiveSection] = useState<DashboardSection | null>("data-selection");
  const navigationTargetRef = useRef<DashboardSection | null>(null);
  const unlockTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let animationFrame = 0;
    const update = () => {
      animationFrame = 0;
      const navigationTarget = navigationTargetRef.current;
      if (navigationTarget) {
        setActiveSection(navigationTarget);
        const hash = `#${navigationTarget}`;
        if (window.location.hash !== hash) window.history.replaceState(window.history.state, "", hash);
        return;
      }
      const bounds = dashboardSections.map((id) => {
        const section = document.getElementById(id);
        if (!section) return null;
        const sectionBounds = section.getBoundingClientRect();
        const dataSelectionEnd = id === "data-selection"
          ? document.querySelector<HTMLElement>(".metric-grid")?.getBoundingClientRect().bottom
          : undefined;
        return { id, bottom: dataSelectionEnd ?? sectionBounds.bottom };
      }).filter((item): item is { id: DashboardSection; bottom: number } => item !== null);

      let current = bounds[0]?.id ?? null;
      for (let index = 1; index < bounds.length; index += 1) {
        if (bounds[index - 1].bottom <= 1) current = bounds[index].id;
      }
      setActiveSection(current);
      if (current) {
        const hash = `#${current}`;
        if (window.location.hash !== hash) window.history.replaceState(window.history.state, "", hash);
      }
    };
    const schedule = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(update);
    };
    const release = () => {
      if (!navigationTargetRef.current) return;
      navigationTargetRef.current = null;
      if (unlockTimerRef.current !== null) window.clearTimeout(unlockTimerRef.current);
      unlockTimerRef.current = null;
      schedule();
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("scrollend", release);
    window.addEventListener("wheel", release, { passive: true });
    window.addEventListener("touchstart", release, { passive: true });
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scrollend", release);
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchstart", release);
      if (unlockTimerRef.current !== null) window.clearTimeout(unlockTimerRef.current);
    };
  }, []);

  const selectSection = (section: DashboardSection) => {
    navigationTargetRef.current = section;
    if (unlockTimerRef.current !== null) window.clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = window.setTimeout(() => {
      navigationTargetRef.current = null;
      unlockTimerRef.current = null;
      window.dispatchEvent(new Event("scroll"));
    }, 1_200);
    setActiveSection(section);
  };

  return { activeSection, selectSection };
}
