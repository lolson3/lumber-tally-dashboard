# Sequoia Forest Products API integration

The Sequoia profile reads tally data from the current Bronze API. The production
container reads `TALLY_API_BASE_URL` (or `SFP_API_BASE_URL`) at startup, while
local Vite development uses `VITE_TALLY_API_BASE_URL`. Browser requests always
use the same-origin `/api` proxy.

The service is read-only from this application's perspective. No credentials or
public production hostnames belong in this repository.

## Resources

| Request | Purpose |
|---|---|
| `GET /api/bronze/tables` | Return table names and row counts used to plan pagination. |
| `GET /api/bronze/tally/files` | Report metadata and report dates. |
| `GET /api/bronze/tally/summary` | Production and recovery summary values by `file_id`. |
| `GET /api/bronze/tally/solutions` | Solution number and board count rows by `file_id`. |
| `GET /api/bronze/tally/reject-reasons` | Reject reason counts by `file_id`. |
| `GET /api/bronze/tally/detail-lines` | Board dimensions, grade, pieces, and board feet by `file_id`. |

Tally collection endpoints accept `limit` and `offset`. The dashboard requests
1,000 rows per page, matching the current backend response cap. The client also
uses the first page's actual size as the offset increment so pagination remains
safe if a smaller page is returned.

```http
GET /api/bronze/tally/files?limit=1000&offset=0
Accept: application/json
```

## Response envelope

Each tally resource returns a bronze-table envelope. Domain fields are nested
inside `payload`.

```json
{
  "table": "tally__files",
  "rows": [
    {
      "id": 242,
      "payload": {
        "file_id": 242,
        "filename": "tally260730-01.txt",
        "filename_date": "2026-07-30",
        "report_datetime": "2026-07-30 15:35:01"
      },
      "batch_id": "...",
      "ingested_at": "2026-08-05T18:01:07.58Z"
    }
  ],
  "count": 1,
  "offset": 0
}
```

`count` is the number of rows in the current page, not the total table size.
Use the `row_count` from `/api/bronze/tables` to determine the required offsets.

## Dashboard behavior

The API exposes source tables rather than dashboard-specific aggregates.
[`src/api/client.ts`](../src/api/client.ts) therefore:

- unwraps each row's `payload`;
- joins tables using `file_id`;
- applies inclusive date filtering to the first 10 characters of
  `report_datetime`;
- calculates solution, reject-reason, grade, and dimension totals locally;
- fetches required pages concurrently and shares requests between panels; and
- caches completed table reads in memory for one minute; and
- refreshes table counts and refetches tables after the one-minute dataset cache
  expires. Bronze rows are never persisted in IndexedDB, and the application
  removes databases created by older releases.

The nginx production proxy accepts only `GET` and `HEAD`, marks API responses
`no-store`, and strips browser authorization and Cookie headers before
forwarding requests upstream.

The date field and inclusivity above are application behavior. The upstream API
does not currently provide server-side date filtering.

## Configuration

```dotenv
DEMO_MODE=false
MILL_ID=sequoia
TALLY_API_BASE_URL=http://tally-api-host:7304
```

Restart the container after changing a runtime value. The configured service
must be reachable from the container network.

## Live contract verification

Run the read-only production contract gate from a network that can reach SFP:

```bash
npm run verify:sfp
```

The verifier exercises the table inventory and all five Tally resources,
follows the same 1,000-row pagination policy as the dashboard, validates every
consumed field, checks cross-table `file_id` references, compares dashboard
aggregations with source totals, and records request and concurrent-load timing.
It reads the origin from process variables or ignored `.env` files and does not
print the private address.

### Verified snapshot: 2026-09-17

The configured live SFP service passed:

| Resource | Rows | Pages | Elapsed |
|---|---:|---:|---:|
| Table inventory | 9 tables | 1 | 652 ms |
| Files | 242 | 1 | 598 ms |
| Summary | 242 | 1 | 1,749 ms |
| Solutions | 608 | 1 | 2,445 ms |
| Reject reasons | 3,388 | 4 | 8,116 ms |
| Detail lines | 7,136 | 8 | 8,669 ms |

The five Tally resources loaded concurrently in 8,671 ms. All fields consumed
by the dashboard had their expected types, with no observed null or missing
values. All cross-table references resolved, and all 11 dashboard/source total
comparisons passed. Counts and timings are a live snapshot rather than fixed
contract values.
