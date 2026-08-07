# Lumber Tally Dashboard — Project Record

## Purpose

This document records the current product scope, architecture, technical
decisions, operational constraints, and unresolved production questions. It is
the durable engineering record for the project; setup and presentation material
belong in the [README](../README.md), while endpoint details belong in the
[API integration reference](API.md).

## Current status

| Item | Current state |
|---|---|
| Phase | Functional demo approaching production readiness |
| Application | Responsive, read-only React dashboard |
| Supported PLC | Board Edger |
| API | Bronze tally table API |
| Deployment | Local/private-network static application; final host undecided |
| Test coverage | Unit, component, API integration, accessibility, and Playwright workflows |
| Containerization | Not used; native deployment remains preferred |
| Last reviewed | 2026-08-07 |

The dashboard is suitable for demonstrations and stakeholder review. Production
release still requires deployment hardening, an agreed security model,
monitoring, and live-environment acceptance testing.

## Product objective

Provide production teams with an accessible, read-only view of lumber tally
data. Users can select a reporting window, review operational summaries, inspect
board-foot distributions and reject/solution totals, and open the complete data
for an individual report.

The application must remain useful on a private network without relying on
third-party runtime assets or public internet access.

## Implemented scope

- Date-range and all-date report selection.
- PLC selection UI with Board Edger enabled and future PLCs represented.
- Production metrics for report count, input pieces and volume, edger output,
  and projected lumber value.
- Production summary table with sticky date column and configurable columns.
- Table and proportional board-dimension views.
- Board-foot charts grouped by grade, thickness, width, or length.
- Natural ordering for numeric dimensions, fractional thicknesses, and grades.
- Solution-total bar chart and reject-reason table.
- Complete report view with expandable raw JSON.
- Cursor-following, viewport-aware tooltips.
- Scroll-aware navigation with URL hash synchronization.
- Responsive desktop, tablet, and mobile layouts.
- Loading, empty, validation, retry, and network-error states.
- Deterministic automated tests and CI verification.

## Current exclusions

- Editing or writing API data.
- A dashboard-owned database.
- Support for PLCs other than Board Edger.
- Public internet exposure.
- User accounts or application-level authorization.
- Docker-based deployment.
- A separate dashboard backend, unless deployment or security requirements make
  one necessary.

## API integration

The dashboard uses the current Bronze API described in [API.md](API.md).

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
2. Requests all required 1,000-row pages concurrently.
3. Unwraps row payloads.
4. Joins resources using `file_id`.
5. Applies inclusive date filtering to the date portion of `report_datetime`.
6. Calculates chart and table aggregates locally.
7. Shares in-flight reads and caches completed tables for one minute.

This approach reduced a measured full sequential load from approximately 52.5
seconds to approximately 13 seconds on the observed network. Lightweight panels
resolve independently rather than waiting for the detail-line table.

## Architecture

### Runtime

```text
Browser
  ├── static React application
  └── same-origin /api requests
          └── web-server or Vite proxy
                  └── Bronze tally API
```

The frontend is built as static assets. Vite provides the `/api` proxy during
development and preview. A production web server must provide equivalent SPA
routing and reverse-proxy behavior.

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
    charts/             Board mix, solutions, and rejects
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
```

Component code owns distinct interface regions. Hooks own React state/effect
behavior such as scroll spying, floating-menu positioning, and canvas lifecycle.
Utilities own reusable calculations that do not depend on React.

## Configuration and deployment

`VITE_TALLY_API_BASE_URL` identifies the upstream API origin for the Vite proxy.
Deployment-specific values belong in ignored environment files or host
configuration, not source control.

The expected native deployment process is:

1. Install a supported Node.js release on the build machine.
2. Run `npm ci` and `npm run test:all`.
3. Produce static assets with `npm run build`.
4. Serve `dist/` using the selected production web server.
5. Configure SPA fallback and reverse-proxy `/api` to the Bronze API.
6. Restrict inbound access using host firewall and network policy.
7. Add HTTPS, authentication, logging, and monitoring as required by the agreed
   production environment.

Vite preview is only a build-verification server, not the recommended production
host.

## Security posture

- Keep the dashboard and API on the intended private network.
- Do not commit credentials, private deployment addresses, or environment files.
- Proxy API traffic through the dashboard origin.
- Treat network location as a boundary, not as authentication.
- Add organization-integrated or proxy-level authentication if users cannot all
  share the same trust level.
- Decide HTTPS and certificate requirements before production deployment.
- Keep the application read-only unless a separately reviewed write workflow is
  introduced.

## Quality and verification

The canonical local pipeline is:

```bash
npm run test:all
```

It currently runs:

- 20 Vitest tests across API behavior, calculations, components, dashboard
  workflows, and accessibility.
- TypeScript project compilation and a Vite production build.
- Two Playwright workflows covering the primary desktop flow and mobile
  navigation.

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

- **Status:** Accepted and implemented for development and preview.
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

### AD-006: Native deployment; Docker deferred

- **Status:** Accepted.
- **Decision:** Do not require Docker for the demo or initial deployment.
- **Reason:** The intended environment currently favors a native local service.
- **Consequence:** Final web-server, service-management, and upgrade procedures
  depend on the selected host operating system.

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

## Open production questions

| Question | Why it matters |
|---|---|
| Which operating system and web server will host the application? | Determines service, proxy, deployment, and update procedures. |
| Will the dashboard and API share a host? | Determines firewall rules, proxy routing, and failure boundaries. |
| Which users and devices may access the dashboard? | Determines authentication and authorization requirements. |
| Is local HTTPS required? | Determines certificate issuance and client trust configuration. |
| What are the authoritative timezone and date-bound semantics? | Required for production-grade filtering guarantees. |
| When will other PLC data contracts become available? | Determines how PLC-specific endpoints, types, and UI modules should be introduced. |
| What data volume and ingestion rate are expected in production? | Determines whether client-side full-table processing remains viable. |
| What availability, logging, monitoring, and support targets apply? | Determines operational readiness and incident response requirements. |
| Will the project remain Apache-licensed or become proprietary? | Must be settled before commercial distribution. |

## Current inventory

| Path | Responsibility |
|---|---|
| `README.md` | Public project presentation, setup, and usage |
| `docs/API.md` | Current Bronze API integration contract |
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
- Defined the read-only local-dashboard objective and deferred Docker pending the
  final deployment environment.
