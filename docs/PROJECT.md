# Lumber Tally Dashboard — Project Record

## Purpose

This document records the current product scope, architecture, technical
decisions, operational constraints, and unresolved production questions. It is
the durable engineering record for the project; setup and presentation material
belong in the [README](../README.md), while endpoint details belong in the
[Sequoia](SFP_API.md) and [North Fork](NFL_API.md) API references.

## Current status

| Item | Current state |
|---|---|
| Phase | Functional demo approaching production readiness |
| Application | Responsive, read-only React dashboard |
| Supported PLC | Board Edger |
| API | Bronze tally table API |
| Deployment | Published Docker image on TrueNAS with nginx, available only on the permitted LAN |
| Test coverage | Unit, component, API integration, accessibility, and Playwright workflows |
| Containerization | Multi-stage Node build with an nginx production runtime |
| Security baseline | Complete locally; deployment-owner LAN controls require acceptance testing |
| Release gate | Tests, browser checks, container build, and health/security smoke checks required before publish |
| Last reviewed | 2026-09-17 |

The dashboard is suitable for demonstrations and stakeholder review. Production
release still requires the deployment-owner network controls, monitoring, and
live-environment acceptance testing recorded in the security baseline.

## Product objective

Provide production teams with an accessible, read-only view of lumber tally
data. Users can select a reporting window, review operational summaries, inspect
product output, board-foot distributions and reject totals, and open the complete data
for an individual report.

The application must remain useful on a private network without relying on
third-party runtime assets or public internet access.

## Implemented scope

- Independent start/end date selection plus 7-, 30-, 90-, and all-date presets.
  The initial range is the previous calendar day in `America/Los_Angeles`
  (Pacific time), matching end-of-day PLC report delivery. Presets include
  complete production days and end on the previous Pacific day.
- PLC selection UI with Board Edger enabled and future PLCs represented.
- Production metrics for adjusted run time and distinct days, input pieces and
  volume, total output, and projected lumber value.
- Run time values subtract one hour of scheduled breaks per run block, floor at
  zero, and compare against 9.5 available hours for an uncapped run-time percentage.
- Production summary table with sticky date column and configurable columns.
- Product breakdown aggregated once by width and length for both graph and
  proportional board views, including pieces, board feet, and percentage.
- Product sorting by board size or piece count in either direction, plus an
  optional Pareto 80/20 view.
- Board-foot charts grouped by grade, thickness, width, or length, with all
  groupings loaded up front to avoid reloads during interaction.
- Natural ordering for numeric dimensions, fractional thicknesses, and grades.
- Scrollable reject-reason table; the redundant Solution Totals panel is removed.
- Complete report view with expandable raw JSON.
- Newest-first, one-at-a-time background prefetching of complete report details
  after the initial dashboard load, retained for the browser session.
- One shared cursor-following, viewport-aware tooltip implementation across
  product, board-foot, and board visualizations.
- Scroll-aware navigation with URL hash synchronization.
- Responsive desktop, tablet, and mobile layouts.
- Loading, empty, validation, retry, and network-error states.
- Deterministic automated tests and CI verification.
- Installable PWA metadata, cross-platform icons, and an offline application
  shell that explicitly excludes live API data from caching.

## Current exclusions

- Editing or writing API data.
- A dashboard-owned database.
- Support for PLCs other than Board Edger.
- Public internet exposure.
- User accounts or application-level authorization.
- A separate dashboard backend, unless deployment or security requirements make
  one necessary.

## API integration

The Sequoia profile uses the current Bronze API described in
[SFP_API.md](SFP_API.md). North Fork's developing contract is tracked in
[NFL_API.md](NFL_API.md).

| Resource | Purpose |
|---|---|
| `GET /api/bronze/tables` | Table names and row counts used to plan pagination |
| `GET /api/bronze/tally/files` | Report metadata and report dates |
| `GET /api/bronze/tally/summary` | Production and recovery summary values |
| `GET /api/bronze/tally/solutions` | Per-file solution rows |
| `GET /api/bronze/tally/reject-reasons` | Per-file reject counts |
| `GET /api/bronze/tally/detail-lines` | Board dimensions, pieces, and board feet |

The service returns bronze envelopes whose domain records are nested in
`payload`. It does not currently expose the dashboard's date-filtered joins and
aggregates.

The client therefore:

1. Reads table row counts.
2. Requests 1,000 rows per page and loads the remaining offsets concurrently.
3. Unwraps row payloads.
4. Joins resources using `file_id`.
5. Applies inclusive date filtering to the date portion of `report_datetime`.
6. Calculates chart and table aggregates locally.
7. Shares in-flight reads and caches completed tables for one minute.
8. Retains Bronze rows only in memory and removes IndexedDB data created by
   older releases for every known mill profile.

This approach reduced a measured full sequential load from approximately 52.5
seconds to approximately 13 seconds on the observed network. Lightweight panels
resolve independently rather than waiting for the detail-line table.

## Architecture

### Runtime

```text
Browser
  ├── static React application
  └── same-origin /api requests
          └── nginx production proxy or local Vite proxy
                  └── Bronze tally API
```

The frontend is built as static assets. Vite provides the `/api` proxy during
development and preview. The published production image uses nginx for static
assets, SPA routing, security headers, health checks, and `/api` proxying.

The production entry point registers a same-origin service worker. It precaches
the generated application shell and static assets, supplies an offline fallback,
and bypasses `/api` so production records retain their normal live-data and
error semantics. PWA installation from non-local devices requires trusted HTTPS.

The image has separate health layers. `/healthz` reports nginx liveness.
`/readyz` checks the active mill's upstream API in non-demo deployments, and
Docker health requires both endpoints. Sequoia uses `/api/bronze/tables`; North
Fork uses `/health`. Demo and in-process mock profiles have no upstream
dependency.

### Frontend responsibilities

- **React 19 and TypeScript:** interface and typed application boundaries.
- **TanStack Query:** server-state lifecycle, retries, caching, and refresh state.
- **Recharts:** bar-chart rendering.
- **Plain CSS:** responsive layout and visual design without runtime style
  dependencies.
- **Vitest and Testing Library:** data, API, component, and workflow tests.
- **axe-core:** automated accessibility checks.
- **Playwright:** production-build desktop and mobile browser workflows.

### Source organization

```text
src/
  api/                 Bronze client, response normalization, domain types
  components/
    charts/             Product breakdown, board mix, shared tooltips, and rejects
    data-selection/     Page header, PLC, and date controls
    production/         Summary table, filters, and board visualization
    reports/            Report list and detail presentation
    sidebar/            Navigation and generated tree artwork
  constants/            Shared dashboard option and section definitions
  hooks/                React lifecycle and DOM interaction behavior
  utils/                Pure data, formatting, and positioning functions
  test/                 Unit, component, accessibility, fixtures, and e2e tests
  App.tsx               Shared state, queries, derived models, page composition
  main.tsx              React and QueryClient bootstrap
  styles.css            Global responsive visual system
public/
  img/                  Runtime-selected mill logos and favicon
  icons/                Platform and maskable installation icons
  offline.html          Offline navigation fallback
  sw.js                 Static application-shell caching; API requests bypassed
docker/
  Dockerfile             Multi-stage Node build and nginx runtime image
  Dockerfile.dockerignore  Root-context exclusions for the Dockerfile
  compose.yaml           Published-image TrueNAS service definition
  nginx.conf.template   Production static server and API proxy configuration
  15-dashboard-runtime.envsh  Validated container startup configuration
bin/
  start.bat             Windows development/demo launcher
  start.sh              Unix development/demo launcher
  verify-sfp-api.mjs    Read-only live SFP contract and performance gate
vite.config.ts          Build config and mill-specific PWA manifest generation
```

Component code owns distinct interface regions. Hooks own React state/effect
behavior such as scroll spying, floating-menu positioning, and canvas lifecycle.
Utilities own reusable calculations that do not depend on React.

## Configuration and deployment

Production containers select the `sequoia`, `north-fork`, or `agwood` profile at
startup with `MILL_ID`. The entrypoint validates runtime settings, writes the
browser-safe `runtime-config.js`, selects the matching prebuilt PWA manifest,
and configures nginx with `TALLY_API_BASE_URL`. The same immutable image can
therefore serve every mill without rebuilding it. Real mill deployments fail
startup when demo mode is disabled without a reachable API origin.

Local Vite development continues to use `VITE_MILL_ID` and
`VITE_TALLY_API_BASE_URL`. The selected profile in `src/config/mills.ts` owns
branding, theme, timezone, icons, PLC defaults, and generated PWA metadata.
`VITE_DASHBOARD_PORT` selects the development and preview server port and
defaults to `5173`; strict port binding prevents scheduled launches from moving
silently to a different address.
`VITE_ALLOWED_HOSTS` supplies a comma-separated allowlist for DNS and
reverse-proxy hostnames, including `tally.biztechro.com` by default.
Deployment-specific values belong in ignored environment files or host
configuration, not source control.

The expected production deployment process is:

1. Run the reusable release gate: dependencies, all automated tests, production
   build, container build, and container smoke tests.
2. Publish only after the gate succeeds, tagging the image with the full commit
   SHA and updating `latest` for convenience.
3. Pin the commit tag or published registry digest in the TrueNAS application;
   never deploy `latest` to production.
4. Configure the mill, demo mode, and API origin at container startup.
5. Publish nginx port 8080 only to the intended business LAN.
6. Block access from guest, untrusted, and public networks using firewall and
   network policy.
7. Add logging, monitoring, and rollback procedures required by the agreed
   production environment.

Vite preview is only a build-verification server, not the recommended production
host.

## Security posture

The production security decision is recorded in [SECURITY.md](SECURITY.md).
The dashboard is served by IP over the permitted local network, and network
membership is the authorization boundary. Repository controls restrict the API
proxy to reads, prevent API caching and credential forwarding, and disable
persistent production-table storage in the browser. TrueNAS networking,
firewall, monitoring, and rollback configuration remain deployment-owner
responsibilities.

## Quality and verification

The canonical local pipeline is:

```bash
npm run test:all
```

It currently runs:

- 31 Vitest tests across API behavior, calculations, components, dashboard
  workflows, and accessibility.
- TypeScript project compilation and a Vite production build.
- Nine Playwright workflows covering production, PWA, persistence, desktop, and
  mobile behavior.

Playwright uses deterministic Bronze API fixtures. GitHub Actions runs the same
pipeline on pushes and pull requests. Live API compatibility must still be
verified as part of deployment acceptance.

## Architecture decisions

### AD-001: Client-side React application

- **Status:** Accepted and implemented.
- **Decision:** Use React, TypeScript, and Vite to produce a static single-page
  dashboard.
- **Reason:** The product is interactive and read-only, and does not currently
  require another application backend.

### AD-002: Same-origin API proxy

- **Status:** Accepted and implemented for development and production.
- **Decision:** Browser requests use `/api`; the serving layer forwards them to
  the configured upstream API.
- **Reason:** Avoid browser CORS coupling and keep the upstream origin out of UI
  code.

### AD-003: Client-side Bronze adapter

- **Status:** Accepted and implemented.
- **Decision:** Centralize pagination, envelope normalization, joins, filtering,
  and aggregation in `src/api/client.ts`.
- **Reason:** The Bronze API exposes source tables rather than dashboard-shaped
  resources.
- **Consequence:** Initial load performance depends on total table size and API
  latency; server-side filters or aggregates would be preferable at larger scale.

### AD-004: Concurrent pagination and short-lived table cache

- **Status:** Accepted and implemented.
- **Decision:** Use table counts to fetch required pages concurrently, share
  in-flight promises, cache completed tables for one minute, and let panels
  resolve independently.
- **Reason:** Sequential pagination caused unacceptable startup latency and an
  all-or-nothing dataset promise blocked lightweight panels.

### AD-005: Feature components, hooks, and utilities

- **Status:** Accepted and implemented.
- **Decision:** Keep `App.tsx` focused on orchestration. Place interface regions
  in components, React lifecycle behavior in hooks, and framework-independent
  calculations in utilities.
- **Reason:** Improve ownership, testability, and maintainability without creating
  one file for every minor function.

### AD-006: Containerized deployment

- **Status:** Accepted and implemented.
- **Decision:** Provide a repository-owned Dockerfile and Compose definition,
  defaulting to the isolated Agwood demo configuration. CI publishes a
  multi-stage image whose final nginx layer contains only production assets.
- **Reason:** The target TrueNAS environment runs published images and requires
  repeatable startup, health monitoring, and safe runtime configuration.
- **Consequence:** Real-data deployments must explicitly disable demo mode and
  provide an API origin reachable from the container.

### AD-009: One runtime-configurable image

- **Status:** Accepted and implemented.
- **Decision:** Build every mill profile and manifest into one image, then select
  the active profile and API proxy origin through validated startup variables.
- **Reason:** All businesses receive the same tested artifact without long-lived
  branches or profile-specific image drift.

### AD-007: No external runtime assets

- **Status:** Accepted and implemented.
- **Decision:** Bundle application code and styles and use local system fonts.
- **Reason:** Preserve usability on a private network without public internet
  access or third-party browser requests.

### AD-008: Production-oriented automated verification

- **Status:** Accepted and implemented.
- **Decision:** Maintain unit, component, API, accessibility, build, and browser
  tests under `src/test`, with CI running the complete pipeline.
- **Reason:** The demo is approaching production readiness and critical workflows
  need repeatable regression protection.

### AD-010: LAN-only access and session-only production data

- **Status:** Accepted and implemented in the application on 2026-09-17.
- **Decision:** Serve the dashboard by IP only on the permitted business LAN,
  with network membership as the access boundary. Permit only read requests
  through nginx, prevent proxy/API caching, strip browser authentication
  material before proxying, and keep live Bronze rows out of persistent browser
  storage.
- **Reason:** The dashboard is read-only but processes complete source tables.
  LAN restriction and session-only browser data minimize exposure and locally
  retained operational information without adding an application identity store.
- **Consequence:** A cold load refetches the complete source dataset; the verified
  SFP snapshot completed that concurrent load in approximately 8.7 seconds.

### AD-011: Gated, immutable container releases

- **Status:** Accepted and implemented on 2026-09-17.
- **Decision:** The main publishing workflow calls the same reusable release gate
  used for verification and cannot publish until it succeeds. Successful main
  builds publish both `latest` and the full commit SHA, while production Compose
  configuration requires an explicit image reference.
- **Reason:** A failed commit must never become a published release, and a
  production deployment must not change merely because a mutable tag moves.

### AD-012: Dependency-aware container health

- **Status:** Accepted and implemented on 2026-09-17.
- **Decision:** Keep `/healthz` as nginx liveness, expose `/readyz` for dependency
  readiness, and make Docker health require both. Mock/demo deployments have no
  external API dependency.
- **Reason:** A running static server is not production-ready when its required
  data service is unavailable.
- **Consequence:** TrueNAS can distinguish an API outage from a healthy
  dashboard. Restart-on-unhealthy behavior remains an orchestrator decision.

## Open production questions

| Question | Why it matters |
|---|---|
| Which TrueNAS release will host the published image? | Determines the exact Custom App and Compose deployment workflow. |
| Will the dashboard and API share a host? | Determines firewall rules, proxy routing, and failure boundaries. |
| Should report timestamps be displayed beyond their source calendar date? | The default range is defined in Pacific time; future timestamp displays may need explicit conversion rules. |
| When will other PLC data contracts become available? | Determines how PLC-specific endpoints, types, and UI modules should be introduced. |
| What data volume and ingestion rate are expected in production? | Determines whether client-side full-table processing remains viable. |
| What availability, logging, monitoring, and support targets apply? | Determines operational readiness and incident response requirements. |
| Will the project remain Apache-licensed or become proprietary? | Must be settled before commercial distribution. |

## Current inventory

| Path | Responsibility |
|---|---|
| `README.md` | Public project presentation, setup, and usage |
| `docs/SFP_API.md` | Sequoia Forest Products Bronze API integration contract |
| `docs/NFL_API.md` | North Fork Lumber API integration contract |
| `docs/SECURITY.md` | LAN-only production security boundary and acceptance checks |
| `docs/PROJECT.md` | Architecture, decisions, status, and production questions |
| `src/api/` | Typed API adapter and models |
| `src/components/` | Feature-focused presentation and interaction components |
| `src/hooks/` | React lifecycle and DOM behavior |
| `src/utils/` | Data transformations, formatting, and positioning |
| `src/test/` | All automated test functions, fixtures, and results location |
| `src/App.tsx` | Dashboard state, queries, and composition |
| `src/styles.css` | Responsive visual system |
| `playwright.config.ts` | Browser-test configuration |
| `vite.config.ts` | Build, test, development, and preview configuration |
| `.github/workflows/test.yml` | Continuous verification pipeline |

## Recent milestones

### 2026-09-17

- Replaced the container's Vite development runtime with a multi-stage build and
  nginx production server.
- Added validated runtime mill/demo configuration, runtime API proxy selection,
  profile-specific PWA manifests, security headers, `/healthz` liveness, and
  API-aware `/readyz` readiness monitoring.
- Preserved a single reusable image for Agwood demo, Sequoia, and North Fork
  deployments.
- Expired Bronze table-count metadata with the one-minute dataset cache so new
  rows become available without reloading the application.
- Verified the complete live SFP Bronze contract, field types/nullability,
  cross-table references, dashboard/source totals, and an 8.7-second concurrent
  cold load using a repeatable read-only gate.
- Completed the repository security baseline: production data is session-only,
  legacy IndexedDB data is removed, the API proxy is read-only and non-cacheable,
  browser credentials are not forwarded upstream, and deployment-owner controls
  are recorded in `docs/SECURITY.md`.
- Gated image publishing on the complete reusable test workflow, required an
  immutable production image reference, and added API-aware container health.

### 2026-08-13

- Added installable PWA support for desktop and mobile platforms with a web app
  manifest, standard/maskable/Apple icons, and standalone display metadata.
- Added production-only service-worker registration, application-shell caching,
  offline navigation fallback, and an explicit no-cache policy for API traffic.
- Documented the trusted-HTTPS requirement for installation on other LAN devices.

### 2026-08-12

- Added adjusted run-time totals and uncapped utilization percentages based on
  a 9.5-hour available-production window after scheduled breaks.
- Updated the default production columns and terminology, including Blank Pass,
  Total Output, report date, run time, and run-time percentage.
- Added the width/length Product Breakdown graph and board view with shared
  aggregates, responsive overflow, sorting, and optional Pareto 80/20 analysis.
- Unified floating tooltips and preloaded every board-foot grouping to eliminate
  interaction-time data reloads.
- Reworked the dashboard sections to Summary, Product Breakdown, and Output &
  Rejects, removing Solution Totals and restoring the board-foot panel position.
- Linked the initial end date to the selected start date so both native calendar
  controls begin in the same month.

### 2026-08-07

- Migrated from the retired dashboard-shaped API to the Bronze tally API.
- Verified representative data equivalence between old and new services.
- Added complete pagination, concurrent page loading, request sharing, and cache
  expiration.
- Refactored the monolithic application into feature components, hooks, and
  utilities.
- Added deterministic natural ordering for mix-chart dimensions and grades.
- Consolidated current API documentation and rewrote the public README.
- Expanded verification to unit, component, API, accessibility, build, desktop,
  and mobile browser tests.

### 2026-08-06

- Added responsive dashboard sections, production filtering and visual mode,
  chart and board tooltips, report transitions, scroll-aware navigation, and
  visual refinements.
- Added transient-error retries, manual retry actions, and clearer response and
  network error states.

### 2026-07-31

- Established the React, TypeScript, Vite, TanStack Query, Recharts, and plain-CSS
  application foundation.
- Defined the read-only local-dashboard objective.
