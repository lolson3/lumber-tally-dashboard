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

- Independent date-range selection plus 7-, 30-, 90-, and all-date presets, defaulting to the prior Pacific production day
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
- Newest-first background prefetching for delay-free report detail navigation
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

See the [Sequoia API reference](docs/SFP_API.md) and [North Fork API
reference](docs/NFL_API.md) for mill-specific endpoints, response envelopes,
and application assumptions.

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

The launchers start normally unless explicitly given the `-demo` tag. Demo mode
generates deterministic fixtures, forces a local-only mock data source for the
configured mill profile, and
serves the dashboard at `http://localhost:5173/`:

```bash
FAKE_DATA_SEED=my-demo sh ./bin/start.sh -demo
```

On Windows, run `bin\start.bat -demo`. Demo mode overrides every profile's API
adapter with the in-process fixture implementation, so it makes no `/api`
requests. Each run generates reports for the latest 90 calendar days, including
the day it starts. Running either launcher without the tag does not generate
data and uses the configured mill and upstream API.

### Docker

Build the runtime image:

```bash
docker build -f docker/Dockerfile -t lumber-tally-dashboard .
```

Run it safely with generated demo data:

```bash
docker run --rm --init -p 8080:8080 lumber-tally-dashboard
```

With no overrides, the image uses Agwood branding, generates the latest 90 days,
and replaces the data adapter with the in-process fixture. Set `MILL_ID` to
`sequoia` or `north-fork` to retain that profile's branding with the same fake
data. Mill selection happens when the container starts, so the same published
image can be used for every deployment.

For a real API, disable demo mode and provide the mill and an API origin
reachable from inside the container:

```bash
docker run --rm --init -p 8080:8080 \
  -e DEMO_MODE=false \
  -e MILL_ID=sequoia \
  -e TALLY_API_BASE_URL=http://host.docker.internal:7304 \
  lumber-tally-dashboard
```

Do not use `127.0.0.1` for a service running on the Docker host; inside the
container it refers to the dashboard container itself. Nginx serves the static
production bundle on port 8080 and proxies same-origin `/api` requests to the
configured upstream.

#### TrueNAS / repository deployment

The repository includes `docker/compose.yaml` for pulling and running the
published GHCR image. Keep deployment values in an ignored `docker/.env` file,
and pin `DASHBOARD_IMAGE` to a commit-specific tag or digest in production:

```bash
cp docker/.env.example docker/.env
docker compose --env-file docker/.env -f docker/compose.yaml pull
docker compose --env-file docker/.env -f docker/compose.yaml up -d
```

Compose defaults to the safe demo mode, the Agwood visual profile, host port
8080, and a restart policy appropriate for a long-running appliance. Configure
the deployment with environment variables in TrueNAS or a repository-adjacent
`.env` file:

```dotenv
DEMO_MODE=true
MILL_ID=agwood
DASHBOARD_HOST_PORT=8080
FAKE_DATA_SEED=demo-seed-v1
```

No volume is required: demo fixtures are recreated inside the container on each
start. To connect real data, set `DEMO_MODE=false` and provide an API URL that is
reachable from the container. The Compose service drops Linux capabilities,
prevents privilege escalation, and exposes `/healthz` through the image health
check for TrueNAS to monitor.

### API configuration

Copy the production container environment template:

```bash
cp docker/.env.example docker/.env
```

PowerShell equivalent:

```powershell
Copy-Item docker/.env.example docker/.env
```

For the nginx production container, use runtime variables:

```dotenv
DEMO_MODE=false
MILL_ID=sequoia
TALLY_API_BASE_URL=http://tally-api-host:7304
DASHBOARD_HOST_PORT=8080
```

`MILL_ID` selects a typed branding and operational profile. Available profiles
are `sequoia`, `north-fork`, and `agwood`. Profiles control the company name,
theme, icons, timezone, PLC availability, date defaults, API adapter, and PWA
manifest. `TALLY_API_BASE_URL` overrides the selected mill-specific API origin.
`SFP_API_BASE_URL` and `NFL_API_BASE_URL` can instead provide reusable defaults.
Non-demo Sequoia and North Fork containers fail startup when no API origin is
configured.

Local Vite development instead uses the corresponding build-time variables in
a root `.env.local` file:

```dotenv
VITE_TALLY_API_BASE_URL=http://tally-api-host:7304
VITE_MILL_ID=sequoia
VITE_DASHBOARD_PORT=5173
VITE_ALLOWED_HOSTS=tally.biztechro.com
```

Start from the tracked template with `cp .env.example .env.local` or
`Copy-Item .env.example .env.local` in PowerShell.

`VITE_DASHBOARD_PORT` controls both the development/start server and the preview
server. It defaults to `5173` when omitted and must be an available port from 1
through 65535.

`VITE_ALLOWED_HOSTS` is a comma-separated list of hostnames permitted to access
the local Vite server. It is not used by the nginx production container.

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
available at `http://localhost:5173` by default. Vite preview is intended for
build verification. The production Docker image uses a multi-stage build and
copies only `dist/` into its nginx runtime stage; Node.js, source files, and
development dependencies are not included in the final image.

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

The [Windows](bin/start.bat) and [Unix](bin/start.sh) launchers are suitable for
a scheduler or service manager, but they start Vite over HTTP. An HTTPS proxy is
therefore still required for installation from phones, tablets, and other LAN
devices.

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
  SFP_API.md            Sequoia Forest Products API integration contract
  NFL_API.md            North Fork Lumber API integration contract
public/
  img/                  Mill logos and favicon
  icons/                Standard, maskable, and Apple installation icons
  offline.html          Offline navigation fallback
  sw.js                 Application-shell service worker
vite.config.ts          Build config and generated PWA manifest
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
