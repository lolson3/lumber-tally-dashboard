# EdgerRDB Dashboard

A read-only local dashboard for the SFP Tally API. It displays production,
recovery, solution, reject-reason, grade-mix, and report-file data for a selected
date or date range.

## Prerequisites

- Node.js 22 LTS or newer supported LTS release
- npm
- Network access to the SFP Tally API

## Configure the API

Copy `.env.example` to `.env.local` if the API is not running at the documented
default address:

```powershell
Copy-Item .env.example .env.local
```

Edit `VITE_TALLY_API_BASE_URL` in `.env.local`. Browser requests are sent directly
to that origin. The documented default is `http://192.168.203.238:8800`.

The API must allow cross-origin requests from the dashboard's origin (for example,
`http://localhost:5173` during development).

## Run for development

```powershell
npm install
npm start
```

`npm run dev` is an equivalent development command.

Open `http://localhost:5173`. The development server listens on all interfaces,
so another permitted LAN device can use `http://<dashboard-host-ip>:5173` while
the process is running and the firewall allows that port.

## Test and build

```powershell
npm test
npm run build
```

## Preview the production build

```powershell
npm run preview
```

Open `http://localhost:4173`. Vite preview is suitable for checking a build but
is not the final production web-server recommendation. Native production hosting
and reverse-proxy instructions will be added once the target host OS is confirmed.

## Current limitations

- The initial dashboard requests up to the API maximum of 5,000 rows per paginated
  endpoint. Automatic multi-page loading will be added after pagination ordering
  and completion behavior are confirmed.
- Date inclusivity and timezone semantics are not documented by the API.
- The dashboard shows the documented default grade grouping only.
- The API currently documents no authentication mechanism.
