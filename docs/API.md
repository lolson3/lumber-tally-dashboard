# Tally API integration

The dashboard reads tally data from the current Bronze API. The upstream origin
is configured with `VITE_TALLY_API_BASE_URL`; browser requests use Vite's
same-origin `/api` proxy.

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
- caches completed table reads in memory for one minute;
- persists the compact domain rows in IndexedDB; and
- compares current table counts on a new visit, reusing unchanged tables and
  requesting only appended offsets when rows have been added. A reduced or
  inconsistent row count causes a safe full-table rebuild.

The date field and inclusivity above are application behavior. The upstream API
does not currently provide server-side date filtering.

## Configuration

```dotenv
VITE_TALLY_API_BASE_URL=http://tally-api-host:7304
```

Restart the Vite development or preview server after changing the value. The
configured service must be reachable from the machine running that server.
