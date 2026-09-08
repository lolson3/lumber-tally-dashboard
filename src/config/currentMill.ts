import { getMillProfile } from "./mills";

export const currentMill = getMillProfile(import.meta.env.VITE_MILL_ID);

export function applyMillProfile() {
  const root = document.documentElement;
  root.style.setProperty("--forest", currentMill.theme.primary);
  root.style.setProperty("--forest-soft", currentMill.theme.primarySoft);
  root.style.setProperty("--amber", currentMill.theme.accent);
  root.style.setProperty("--metric", currentMill.theme.metric);
  root.style.setProperty("--action", currentMill.theme.action);
  root.style.setProperty("--focus", currentMill.theme.focus);
  root.style.setProperty("--sidebar-text", currentMill.theme.sidebarText);
  root.style.setProperty("--dashboard-background", currentMill.theme.background);
  document.title = currentMill.dashboardName;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", currentMill.theme.themeColor);
  document.querySelector('meta[name="description"]')?.setAttribute("content", currentMill.description);
  document.querySelector('meta[name="application-name"]')?.setAttribute("content", currentMill.dashboardName);
  document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute("content", currentMill.shortName);
  document.querySelector('link[rel="icon"]')?.setAttribute("href", currentMill.icons.favicon);
  document.querySelector('link[rel="apple-touch-icon"]')?.setAttribute("href", currentMill.icons.appleTouch);
}
