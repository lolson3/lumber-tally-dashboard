# Lumber Tally Dashboard

A responsive production dashboard for exploring lumber tally reports, operational
summary metrics, product output, board mix, reject reasons, and complete source
reports.

> **Project status:** Functional demo. The application is approaching
> production quality and includes automated unit, accessibility, build, and
> browser testing, but deployment hardening and authentication requirements are
> still being evaluated.

## Overview

The dashboard turns raw bronze tally tables into an interactive, read-only view
for production teams. Users can choose a reporting window, review summarized
performance, inspect board-foot distributions, and open the complete data behind
an individual tally report.

The current demo supports the **Board Edger** PLC. Additional PLC choices are
represented in the interface but remain disabled until their data contracts and
report mappings are available.

## Features

- Date-range and all-date report selection, with the end date initially linked to the selected start date
- PLC selection prepared for multiple production systems
- Production overview cards for adjusted run time/days, input, total output, and projected value
- Horizontally scrollable production summary with a sticky report-date column
- Configurable production columns with select-all and deselect-all controls
- Product breakdown by width and length with graph and proportional board views
- Product piece counts, board feet, percentages, size/piece sorting, and Pareto 80/20 analysis
- Board-foot charts grouped by grade, thickness, width, or length without interaction-time reloads
- Naturally ordered chart categories, including fractions and numbered grades
- Scrollable reject-reason summary
- Complete report detail view with expandable raw JSON
- Shared cursor-following, viewport-aware chart and board tooltips
- Scroll-aware sidebar navigation with synchronized URL hashes
- Responsive desktop, tablet, and mobile layouts
- Loading, empty, retry, and network-error states

## Technology

| Area | Technology |
|---|---|
| Interface | React 19 and TypeScript |
| Build tooling | Vite |
| Server state | TanStack Query |
| Charts | Recharts |
| Styling | Responsive plain CSS |
| Unit and component tests | Vitest and Testing Library |
| Accessibility checks | axe-core |
| Browser tests | Playwright |

## Architecture

The application is a client-side dashboard served through Vite. During
development and preview, browser requests use the same-origin `/api` path and
Vite proxies them to the configured Bronze API.

```text
Browser
  ├── React dashboard
  └── /api requests
          └── Vite proxy
                  └── Bronze tally API
```

The upstream service exposes source tables rather than dashboard-specific
aggregates. The API adapter therefore paginates table reads, unwraps bronze row
payloads, joins records by `file_id`, applies the selected date range, and
calculates chart totals locally. Table requests are shared between panels and
cached briefly to avoid redundant network traffic.

See [the API integration reference](docs/API.md) for the current endpoints,
response envelope, and application assumptions.

## Getting started

### Prerequisites

- Node.js 22 LTS or another currently supported LTS release
- npm
- Network access to a compatible Bronze tally API

### Installation

```bash
git clone <repository-url>
cd lumber-tally-dashboard
npm install
```

### API configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

PowerShell equivalent:

```powershell
Copy-Item .env.example .env.local
```

Set the upstream API origin in `.env.local`:

```dotenv
VITE_TALLY_API_BASE_URL=http://tally-api-host:7304
```

Environment files are ignored by Git. Do not commit credentials or private
deployment addresses.

### Development

```bash
npm run dev
```

Open `http://localhost:5173`. The development server listens on all interfaces,
so permitted devices on the same network can also connect through the host
machine's address when firewall rules allow it.

## Testing

Run unit, component, integration, and accessibility tests:

```bash
npm test
```

Run Playwright browser tests:

```bash
npm run test:e2e
```

Run the complete production verification pipeline:

```bash
npm run test:all
```

`test:all` runs the Vitest suite, performs a TypeScript production build, and
executes the Playwright desktop and mobile workflows. The same pipeline is
configured for GitHub Actions.

## Production build

```bash
npm run build
npm run preview
```

The compiled static assets are written to `dist/`, and the preview server is
available at `http://localhost:4173` by default. Vite preview is intended for
build verification; a production deployment should use an appropriate static
web server and reverse-proxy configuration.

## Installable app (PWA)

The dashboard includes a web app manifest, platform-specific icons, and an
application-shell service worker. Supported browsers can install it on Windows,
macOS, Android, iOS, iPadOS, ChromeOS, and Linux, subject to each platform's
browser support. The installed shell can launch without a connection, while
live production data still requires access to the Bronze API. API responses are
deliberately excluded from offline caches so operational data is never presented
as current after becoming stale.

Build and serve the application normally, then use the browser's **Install app**
or **Add to Home Screen** action. Service workers require a secure context:
`localhost` is accepted for local use, but access from other devices must be
served through trusted HTTPS. For private-network deployment, place the running
dashboard behind an HTTPS reverse proxy with SPA fallback and `/api` forwarding.

The root [start.bat](start.bat) and [start.sh](start.sh) launchers are suitable
for a scheduler or service manager, but they start Vite over HTTP. An HTTPS proxy
is therefore still required for installation from phones, tablets, and other
LAN devices.

## Project structure

```text
src/
  api/                 Bronze API adapter and domain types
  components/          Feature-focused React components
    charts/
    data-selection/
    production/
    reports/
    sidebar/
  hooks/               React lifecycle and interaction behavior
  utils/               Data transformations, formatting, and positioning
  test/                Unit, component, accessibility, and browser tests
  App.tsx               Shared state, queries, and page composition
  main.tsx              React and TanStack Query bootstrap
  styles.css            Responsive visual system
docs/
  API.md                Current API integration contract
public/
  icons/                Standard, maskable, and Apple installation icons
  manifest.webmanifest  Cross-platform app identity and launch behavior
  offline.html          Offline navigation fallback
  sw.js                 Application-shell service worker
```

## Demo limitations and production considerations

- Only Board Edger data is currently selectable.
- The API does not currently provide server-side date filtering or dashboard
  aggregates, which requires the client to retrieve and process complete source
  tables.
- Initial load time depends on the API's response latency and dataset size.
- Authentication and authorization are not currently defined by the API.
- A production deployment still needs an agreed hosting environment, HTTPS and
  network policy, monitoring, and operational support procedures.
- Automated tests use deterministic API fixtures; validation against the live
  environment remains part of deployment acceptance.

## License

This repository currently uses the [Apache License 2.0](LICENSE). If the demo is
developed into a proprietary commercial product, the project owner should review
the licensing and ownership strategy before distributing additional releases.
