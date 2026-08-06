# Lumber Tally Dashboard Project

## Purpose

This file is the durable project record for the lumber tally dashboard. It captures
the project's goals, constraints, architecture, technical decisions, known
unknowns, and change history so that implementation can be reviewed and resumed
without relying on conversation history.

This manifest must be reviewed and updated as part of every material project
change. A change is not considered complete until the affected decisions,
architecture, behavior, dependencies, files, verification results, and known
follow-up work are recorded here.

## Project status

| Item | Current state |
|---|---|
| Phase | Basic dashboard implementation complete; ready for review and iteration |
| Dashboard implementation | Runnable initial version |
| API | Existing SFP Tally API, version `0.1.0` |
| Deployment target | A local web application on the same private network as the API and its data source |
| Containerization | Not used; Docker is intentionally deferred |
| Last updated | 2026-07-31 (basic dashboard implementation) |

## Product objective

Build a locally hosted, read-only dashboard that securely presents data from the
SFP Tally API. The first version must allow users to view associated data for a
specific date or across a selected date range.

The dashboard and API are expected to run at the location where the source data
is generated and remain accessible only to intended users on that network.

## Initial functional scope

The first dashboard iteration is expected to include:

- A single-date and date-range selector.
- Summary metrics for the selected period.
- Production-summary and recovery views.
- Solution, reject-reason, and grade-mix views.
- A report-file list and a way to inspect an individual file's details.
- Explicit loading, empty, validation-error, API-unavailable, and unexpected-error states.
- A responsive layout suitable for desktop and tablet displays.

### Out of scope for the initial iteration

- Editing API data.
- A dashboard-owned database.
- Public internet exposure.
- Docker or other container-based deployment.
- A separate dashboard application backend unless a concrete requirement emerges.
- User accounts or application-level authorization until access requirements are defined.

## API context

The consolidated human-readable API reference is located at
`Documentation/tallyapiexamples.md`. The source OpenAPI 3.1 document is located
at `Documentation/tallyapi.json`, and the original API-page screenshots remain in
the same directory.

### Observed API details

| Item | Value |
|---|---|
| Title | SFP Tally API |
| Version | `0.1.0` |
| Observed base URL | `http://192.168.203.238:8800` |
| Media type | `application/json` |
| Operations | Read-only `GET` requests |
| Authentication | None declared in OpenAPI or shown in supplied screenshots |
| Pagination | `limit` defaults to `1000`, maximum `5000`; `offset` defaults to `0` |
| Date parameters | Optional `start` and `end` values with OpenAPI `date` format |

### Available endpoints

| Endpoint | Purpose |
|---|---|
| `GET /health` | API availability check |
| `GET /files` | List report files |
| `GET /files/{file_id}` | Retrieve one complete report |
| `GET /production-summary` | Retrieve production metrics |
| `GET /recovery` | Retrieve recovery metrics |
| `GET /solutions` | Retrieve per-file solution rows or aggregated totals |
| `GET /reject-reasons` | Retrieve per-file reject reasons or aggregated totals |
| `GET /grade-mix` | Retrieve grouped grade/detail output |

### API uncertainties that affect implementation

- The OpenAPI document does not declare a server URL; the current address comes
  from screenshots and must be configuration rather than hard-coded application logic.
- The date field being filtered, date-bound inclusivity, and timezone are not documented.
- Pagination ordering, total counts, and end-of-results behavior are not documented.
- Valid `/grade-mix` `group_by` values other than the default `grade` are not documented.
- Several timestamp and time fields are typed only as strings, with no exact format.
- Rate limits and errors other than validation status `422` are not documented.
- No API authentication or authorization mechanism is currently declared.

Until clarified, the UI must avoid presenting assumptions about these semantics as
facts. Any necessary implementation assumption must be documented in the decision
log before it is introduced.

## Chosen technical direction

### Frontend

- **React with TypeScript** for component-based UI development and compile-time
  validation of API models.
- **Vite** for development, builds, and static production assets.
- **TanStack Query** for server-state fetching, cache management, retries, and
  loading/error state coordination.
- **Recharts** for dashboard visualizations.
- **Plain CSS using design tokens** for responsive styling and consistent visual
  decisions without adopting a large UI component framework initially.
- **Vitest and React Testing Library** for unit and component tests.
- **Playwright** for a focused set of end-to-end tests around filtering and failure states.

### Hosting and API routing

The production frontend will be compiled to static files and served by a local
web server. The browser sends API requests directly to the configured Tally API
origin (`http://192.168.203.238:8800` by default).

```text
Browser
   |-- dashboard assets -> local dashboard web server
   `-- API requests     -> SFP Tally API at 192.168.203.238:8800
```

The API must permit the dashboard origin through its CORS configuration.

### Local development

During development and production, `VITE_TALLY_API_BASE_URL` configures the API
origin. It defaults to `http://192.168.203.238:8800` in the application client.

Node.js LTS is installed at `C:\Program Files\nodejs`. Its installer registered
that directory in the Windows machine PATH. Terminals and editor processes that
were open before installation retain an older PATH snapshot and must be restarted
before `node` and `npm` resolve normally. For an immediate refresh in an existing
PowerShell session, run:

```powershell
$env:Path = "$([Environment]::GetEnvironmentVariable('Path','Machine'));$([Environment]::GetEnvironmentVariable('Path','User'))"
```

### Deployment without Docker

Docker is intentionally excluded for now. The anticipated deployment consists of:

1. Installing a supported Node.js release on the development/build machine.
2. Installing dependencies and producing a static Vite build.
3. Copying the generated assets to the local production host if it is a different machine.
4. Running a native web server as an operating-system service.
5. Configuring the web server to serve the SPA and reverse-proxy `/api` to the API.
6. Restricting inbound access using the host firewall and intended network boundaries.

The exact commands and service configuration will be documented once the target
host operating system is known.

## Security posture

Same-network hosting reduces exposure but does not itself provide authentication
or authorization. The initial security posture is:

- Do not expose the dashboard or API to the public internet.
- Bind services only to interfaces required for local access.
- Restrict inbound traffic with the host firewall and network policy.
- Proxy browser API traffic through the dashboard origin rather than requiring
  direct browser access to the API host and port.
- Do not place secrets, credentials, or environment-specific addresses in source code.
- Add proxy-level or organization-integrated authentication if the audience or
  network trust model requires it.
- Decide whether local HTTPS is required after the host environment and client
  certificate-trust options are known.

## Architecture principles

- Keep the initial system read-only and small.
- Treat the existing API as the source of truth.
- Generate TypeScript interfaces from or reconcile them with the OpenAPI schemas.
- Keep environment-specific addresses in configuration.
- Centralize API access and response normalization rather than fetching directly
  from presentation components.
- Make date selection part of the query key so cached results correspond to the
  active filter.
- Display units and labels only when their meanings are supported by documentation.
- Preserve raw API values where interpretation is uncertain.
- Build accessible filters, tables, charts, and error messages.
- Add dependencies only when they solve a current, documented requirement.

## Proposed application structure

This is a proposed structure, not yet implemented:

```text
src/
  api/          API client, endpoint functions, and response types
  components/   Reusable UI and visualization components
  features/     Date filters and domain-specific dashboard sections
  pages/        Page-level composition
  styles/       Design tokens and global styles
  test/         Shared test setup and fixtures
```

## Decision log

### D-001: Maintain a durable project manifest

- **Date:** 2026-07-31
- **Status:** Accepted
- **Decision:** Maintain `PROJECT_MANIFEST.md` as the central record of project
  direction, decisions, material changes, verification, and unresolved questions.
- **Reason:** The project needs durable context that can be reviewed independently
  of chat history and kept current as implementation evolves.
- **Consequence:** Every material change includes a manifest review and, when
  relevant, an update to its decisions, architecture, inventory, or change log.

### D-002: Use a client-side React and TypeScript application

- **Date:** 2026-07-31
- **Status:** Accepted and implemented
- **Decision:** Use React, TypeScript, and Vite for the dashboard frontend.
- **Reason:** The product is an interactive, read-only dashboard backed by an
  existing API. A static single-page application provides the necessary UI model
  without requiring another application backend.
- **Consequence:** Production output can be served as static files, and API access
  will use a reverse proxy for same-origin requests.

### D-003: Use focused data and visualization libraries

- **Date:** 2026-07-31
- **Status:** Accepted and implemented in the initial scope
- **Decision:** Use TanStack Query for API server state and Recharts for charts.
- **Reason:** Query caching and lifecycle handling are central to date-filtered API
  views, while Recharts provides React-native chart composition without requiring
  a custom visualization layer.
- **Consequence:** These libraries are production dependencies and are accessed
  through typed API functions and reusable components. Playwright is deferred
  until the dashboard has stable user flows worth exercising end to end.

### D-004: Defer Docker

- **Date:** 2026-07-31
- **Status:** Accepted
- **Decision:** Do not use Docker for development or initial deployment.
- **Reason:** The project owner prefers a native local deployment for the initial phase.
- **Consequence:** Build prerequisites, static asset deployment, reverse-proxy
  installation, service management, and upgrades must be documented for the host OS.

### D-005: Use a same-origin API reverse proxy

- **Date:** 2026-07-31
- **Status:** Accepted; implemented for Vite development and preview
- **Decision:** Serve the UI and proxy API requests through one dashboard origin.
- **Reason:** This avoids browser CORS coupling, keeps the upstream API address in
  deployment configuration, and provides a control point for TLS and access policy.
- **Consequence:** Development and production each require proxy configuration.

### D-006: Keep the first data presentation direct and inspectable

- **Date:** 2026-07-31
- **Status:** Accepted and implemented
- **Decision:** Present production, recovery, solution-total, reject-total,
  grade-mix, and file data with summary cards, one simple grade chart, tables,
  and an inspectable file-detail panel.
- **Reason:** The first milestone is to prove dependable access to all API data
  before adding domain-specific transformations or a more elaborate visual hierarchy.
- **Consequence:** Most data remains close to the API representation. The complete
  selected file is also available as formatted raw JSON for fields not yet given
  a dedicated presentation.

### D-007: Default to today's date and fetch at most 5,000 rows per endpoint

- **Date:** 2026-07-31
- **Status:** Accepted as an initial assumption
- **Decision:** Initialize both date inputs to the client's local date and request
  the documented maximum page size (`limit=5000`, `offset=0`) for paginated endpoints.
- **Reason:** This gives a useful specific-date landing view and minimizes the
  chance that the first dashboard silently shows only the API's default 1,000 rows.
- **Consequence:** The dashboard may still omit data when a query has more than
  5,000 rows. Automatic pagination remains blocked on confirmation of stable
  ordering and completion behavior. Users can explicitly choose “All dates.”

### D-008: Avoid external runtime assets

- **Date:** 2026-07-31
- **Status:** Accepted and implemented
- **Decision:** Use local system font stacks and bundle all application code and styles.
- **Reason:** The dashboard must remain usable on a private network without public
  internet access and should not leak browser requests to third-party asset hosts.
- **Consequence:** Typography varies slightly by client operating system, but the
  dashboard has no CDN or web-font dependency.

## Open questions

| Question | Why it matters | Status |
|---|---|---|
| What operating system will host the dashboard? | Determines native web server, service management, and deployment instructions. | Open |
| Will the production dashboard run on the API machine or a separate machine on the same LAN? | Determines proxy target, firewall rules, and failure boundaries. | Open |
| Which users or devices may access it? | Determines whether network restrictions alone are sufficient. | Open |
| Is HTTPS required on the local network? | Determines certificate issuance and client trust setup. | Open |
| What timezone and date-bound semantics does the API use? | Required for accurate date filtering and labels. | Open |
| What are the supported grade-mix groupings? | Determines which grouping controls can safely be offered. | Open |
| What is the expected data volume and refresh frequency? | Influences pagination, caching, chart aggregation, and performance testing. | Open |
| Which metrics are most important on the landing view? | Determines the initial information hierarchy. | Open |

## Project inventory

| Path | Purpose | State |
|---|---|---|
| `PROJECT.md` | Decisions, architecture, project context, and change history | Active |
| `Documentation/tallyapiexamples.md` | Consolidated API usage and schema reference | Active |
| `Documentation/tallyapi.json` | Source OpenAPI 3.1 specification | Reference artifact |
| `Documentation/Screenshot *.png` | Original API documentation screenshots | Reference artifacts |
| `package.json` / `package-lock.json` | Dependencies and native npm run/build/test commands | Active |
| `vite.config.ts` | React build plus configurable `/api` proxy for development and preview | Active |
| `.env.example` | Example upstream API target configuration | Active |
| `src/api/` | Typed API contracts, centralized HTTP client, and client tests | Active |
| `src/components/` | Reusable panel, table, and query-state presentation | Active |
| `src/App.tsx` | Date controls, queries, metrics, charts, tables, and file detail | Active |
| `src/styles.css` | Responsive local-only visual system | Active |
| `README.md` | Native setup, run, test, build, and preview instructions | Active |
| `dist/` | Generated production build; ignored by source control | Generated |

## Verification record

| Date | Change | Verification | Result |
|---|---|---|---|
| 2026-07-31 | Created project manifest | Manual content and scope review | Passed |
| 2026-07-31 | API client | Vitest: 2 tests | Passed |
| 2026-07-31 | Dashboard application | TypeScript project build and Vite production build | Passed |
| 2026-07-31 | Local dashboard server | `GET http://127.0.0.1:5173` returned HTML with root mount | Passed (`200`) |
| 2026-07-31 | Development API proxy | `GET /api/health` returned `{"status":"ok"}` | Passed (`200`) |
| 2026-07-31 | Live endpoint compatibility | Read-only smoke requests to files, production, recovery, solution totals, reject totals, and grade mix | Passed |
| 2026-07-31 | Node/npm command discovery | Confirmed persistent machine PATH and refreshed a stale shell environment | Passed (`node` 24.18.1, `npm` 11.16.0) |

## Change log

### 2026-08-06

- Routed browser data requests through a same-origin `/api` proxy in Vite development
  and preview, using `VITE_TALLY_API_BASE_URL` only as the upstream proxy target.
- Added error-aware exponential retries for transient network and server failures,
  clearer network and invalid-response errors, and per-panel manual retry actions.
- Kept client and validation errors non-retriable and prevented aborted requests from
  being retried.

### 2026-07-31

- Created this project manifest before dashboard development.
- Recorded the product objective, initial scope, API context, technical direction,
  security posture, proposed structure, open questions, and current inventory.
- Recorded the decision to defer Docker and use a native deployment approach.
- Marked the frontend stack and reverse-proxy architecture as proposed pending
  explicit approval to begin implementation.
- Installed Node.js LTS `24.18.1` natively; Docker remains unused.
- Added the React 19, TypeScript, and Vite application scaffold and npm lockfile.
- Added a configurable Vite `/api` proxy targeting the documented network API by default.
- Added typed requests for health, files, file detail, production summary,
  recovery, solution totals, reject-reason totals, and grade mix.
- Added date-range controls defaulting to the local current date, an all-dates
  action, API health status, loading/error/empty states, summary metrics, simple
  data tables, a grade-mix chart, and file-detail inspection.
- Added responsive styling with no third-party runtime assets.
- Added API-client unit tests and native run/build/test instructions.
- Verified unit tests, TypeScript compilation, the production build, the running
  dashboard server, the live proxy health check, and live payload compatibility
  for every collection endpoint used by the dashboard.
- Diagnosed post-install `node`/`npm` command discovery: the persistent machine
  PATH was correct, but terminals opened before installation retained a stale
  environment. Confirmed that rebuilding PATH from Windows user and machine values
  restores both commands without reinstalling Node.
