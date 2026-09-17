import { millProfiles } from "../config/mills";

const LEGACY_DATABASE_NAMES = Object.keys(millProfiles)
  .map((millId) => `lumber-tally-dashboard-${millId}`);

function deleteDatabase(name: string) {
  return new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

export async function clearLegacyBrowserData() {
  if (!("indexedDB" in globalThis)) return;
  await Promise.all(LEGACY_DATABASE_NAMES.map(deleteDatabase));
}

// Earlier releases stored complete Bronze tables by mill. Clear every known
// namespace during startup; current releases retain API data in memory only.
void clearLegacyBrowserData();
