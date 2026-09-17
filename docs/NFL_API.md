# North Fork Lumber API

This document records the North Fork Lumber API contract shown in the Swagger
screenshots captured on 2026-08-21. The service exposes read-only health,
ingestion-history, summary, and Bronze-table browsing endpoints for the
`porter` and `tally` sources.

The screenshots use a private-network HTTP origin. Production containers read
`TALLY_API_BASE_URL` or `NFL_API_BASE_URL` at startup; local Vite development
uses `VITE_NFL_API_BASE_URL`. Browser requests continue through the dashboard's
same-origin `/api` proxy.

All row counts, identifiers, filenames, and timestamps below are examples from
the captured responses. They describe that snapshot and are not fixed values.

## Endpoint summary

| Method | Route | Parameters | Purpose |
|---|---|---|---|
| `GET` | `/health` | None | Check service health |
| `GET` | `/api/sources` | None | List sources seen in Bronze ingest history and their latest run |
| `GET` | `/api/summary` | None | Return Bronze row and table counts by source |
| `GET` | `/api/ingest/runs` | Optional `limit` query; example shown as `50` | List recent ingest runs, newest first |
| `GET` | `/api/bronze/tables` | None | List Bronze landing tables and row counts |
| `GET` | `/api/bronze/{source}/{table}` | Required `source` and `table` paths; optional `limit` and `offset` queries | Read paginated raw rows from one Bronze table |

The updated screenshots do not show a `POST /api/ingest/scan` route. Ingestion
runs are written by NFLETL and exposed here as read-only history.

## Health

```http
GET /health
Accept: */*
```

Successful response (`200`, described as “Service is up”):

```json
{
  "ok": true,
  "service": "nfldataapi"
}
```

## Sources

```http
GET /api/sources
Accept: */*
```

Successful response (`200`, described as “Source list”):

```json
{
  "sources": [
    {
      "name": "porter",
      "last_run": {
        "source": "porter",
        "finished_at": "2026-08-17T23:10:04.374Z",
        "status": "ok",
        "rows_inserted": 0
      }
    },
    {
      "name": "tally",
      "last_run": {
        "source": "tally",
        "finished_at": "2026-08-17T23:10:04.676Z",
        "status": "ok",
        "rows_inserted": 0
      }
    }
  ]
}
```

Unlike the earlier contract, the captured source objects do not include source
type, filesystem path, configuration, or availability fields.

## Bronze summary

```http
GET /api/summary
Accept: */*
```

Successful response (`200`, described as “Summary counts”):

```json
{
  "total_rows": 13200,
  "total_tables": 8,
  "by_source": {
    "porter": {
      "tables": 3,
      "rows": 1584
    },
    "tally": {
      "tables": 5,
      "rows": 11616
    }
  }
}
```

## Ingest-run history

```http
GET /api/ingest/runs?limit=50
Accept: */*
```

`limit` is an optional integer query parameter. The Swagger example uses `50`;
the screenshots do not establish its default, minimum, or maximum.

Successful responses (`200`, described as “Recent runs, newest first”) contain
a `runs` array:

```json
{
  "runs": [
    {
      "id": 4,
      "source": "tally",
      "started_at": "2026-08-17T23:10:04.385Z",
      "finished_at": "2026-08-17T23:10:04.676Z",
      "status": "ok",
      "tables_scanned": 5,
      "rows_inserted": 0,
      "rows_skipped": 11616,
      "error": null
    },
    {
      "id": 3,
      "source": "porter",
      "started_at": "2026-08-17T23:10:03.681Z",
      "finished_at": "2026-08-17T23:10:04.374Z",
      "status": "ok",
      "tables_scanned": 3,
      "rows_inserted": 0,
      "rows_skipped": 1584,
      "error": null
    }
  ]
}
```

## Bronze table inventory

```http
GET /api/bronze/tables
Accept: */*
```

Successful responses (`200`) contain a `tables` array. The captured inventory
is:

```json
{
  "tables": [
    { "table_name": "porter__downtime_events", "row_count": 180 },
    { "table_name": "porter__production_tally", "row_count": 1200 },
    { "table_name": "porter__saw_maintenance", "row_count": 204 },
    { "table_name": "tally__detail_lines", "row_count": 7136 },
    { "table_name": "tally__files", "row_count": 242 },
    { "table_name": "tally__reject_reasons", "row_count": 3380 },
    { "table_name": "tally__solutions", "row_count": 688 },
    { "table_name": "tally__summary", "row_count": 242 }
  ]
}
```

Swagger describes this route as listing Bronze landing tables with row counts.
The inventory counts total 13,272 rows, while the separately captured summary
reports 13,200. Specifically, `tally__detail_lines` would need to contain 7,064
rows for the summary's Tally subtotal to reconcile, rather than the 7,136 shown
in the inventory. This likely reflects data changing between requests, but the
screenshots alone do not prove the cause. Treat both endpoints as live snapshots.

Table names use the `{source}__{table}` convention, while row requests pass the
source and unprefixed table name separately.

## Reading Bronze rows

The captured example reads the Tally file table:

```http
GET /api/bronze/tally/files?limit=1000&offset=0
Accept: */*
```

| Parameter | Location | Type | Required | Captured value |
|---|---|---|---:|---:|
| `source` | path | string | yes | `tally` |
| `table` | path | string | yes | `files` |
| `limit` | query | integer | no | `1000` |
| `offset` | query | integer | no | `0` |

A successful response (`200`) is described as “Raw rows (payload JSONB +
lineage columns)” and uses this envelope:

```json
{
  "table": "tally__files",
  "rows": [
    {
      "id": 242,
      "payload": {
        "_rowid": 242,
        "File_id": 242,
        "filename": "tally260730-01.txt",
        "loaded_at": "2026-08-13 23:24:59",
        "filename_date": "2026-07-30",
        "report_datetime": "2026-07-30 15:35:01"
      },
      "batch_id": "53e0ecb9-3cc2-4799-8f93-f4bee35b1d1d",
      "ingested_at": "2026-08-17T23:04:45.625Z"
    }
  ]
}
```

The `payload` object is source-table-specific. The top-level `id`, `batch_id`,
and `ingested_at` values are Bronze lineage columns and should not be confused
with fields inside `payload`. Field names are case-sensitive; the captured
Tally payload uses `File_id` with a capital `F`.

Swagger documents these status codes:

| Status | Meaning |
|---:|---|
| `200` | Raw rows returned |
| `404` | Unknown Bronze table |

The screenshots do not establish the response behavior for invalid pagination,
the maximum page size, or whether the response contains pagination metadata
beyond `table` and `rows`.

## Integration notes

- Discover available datasets from `/api/bronze/tables`; do not hard-code the
  captured row counts.
- Page tables through `/api/bronze/{source}/{table}` with `limit` and `offset`.
- Define a separate payload type for each table. The `tally/files` example does
  not establish the schemas of summary, solutions, reject reasons, or Porter
  production data.
- Use `porter__production_tally` for Porter production records only after its
  payload schema has been sampled and verified.
- Keep ingestion-history timestamps and Bronze lineage timestamps distinct from
  source report timestamps such as `report_datetime`.

## Remaining contract questions

- Are `/api/summary` and `/api/bronze/tables` read from the same snapshot, and
  what explains their captured 72-row difference?
- What are the complete payload schemas for each Porter and Tally table?
- What defaults and bounds apply to `limit` and `offset`?
- Does a row response include total-count or next-page metadata?
- Are filtering or sorting parameters supported?
- What timezone applies to source timestamps that do not include an offset?
- Does production access require authentication?
