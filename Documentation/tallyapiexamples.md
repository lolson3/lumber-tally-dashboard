# SFP Tally API Reference and Examples

This document consolidates the API usage shown in the screenshots, the OpenAPI
3.1 specification in `tallyapi.json`, and the response models previously listed
in `tallyapischemas.md`.

## API overview

| Item | Value |
|---|---|
| API title | SFP Tally API |
| API version | 0.1.0 |
| OpenAPI version | 3.1.0 |
| Base URL observed in screenshots | `http://192.168.203.238:8800` |
| Request method | All documented operations use `GET` |
| Response media type | `application/json` |
| Authentication | None is shown in the screenshots or declared in the OpenAPI document |

The base URL above is a private-network address and may only be reachable from
the appropriate local network. If the service moves, replace it in every example
or set it once in an environment variable.

PowerShell setup:

```powershell
$TallyApiBaseUrl = "http://192.168.203.238:8800"
```

Bash setup:

```bash
TALLY_API_BASE_URL='http://192.168.203.238:8800'
```

## Endpoint summary

| Endpoint | Purpose | Successful response |
|---|---|---|
| `GET /health` | Check service availability | Health-status object |
| `GET /files` | List report files | `FileOut[]` |
| `GET /files/{file_id}` | Fetch a complete report by ID | `FileDetail` |
| `GET /production-summary` | Fetch production summary rows | `ProductionSummaryRow[]` |
| `GET /recovery` | Fetch recovery metrics | `RecoveryRow[]` |
| `GET /solutions` | Fetch solution rows or aggregated totals | `SolutionRowOut[]` or `SolutionTotalOut[]` |
| `GET /reject-reasons` | Fetch reject-reason rows or aggregated totals | `RejectReasonRowOut[]` or `RejectReasonTotalOut[]` |
| `GET /grade-mix` | Aggregate grade/detail output | `GradeMixRow[]` |

## Common query parameters

Most collection endpoints accept some or all of these parameters:

| Parameter | Type | Required | Default/limits | Notes |
|---|---|---:|---|---|
| `start` | date string | No | None | OpenAPI format is `date`; use `YYYY-MM-DD`. |
| `end` | date string | No | None | OpenAPI format is `date`; use `YYYY-MM-DD`. |
| `limit` | integer | No | `1000`; minimum `1`, maximum `5000` | Used by `/files`, `/production-summary`, `/recovery`, `/solutions`, and `/reject-reasons`. |
| `offset` | integer | No | `0`; minimum `0` | Used with `limit` for pagination. |
| `totals` | boolean | No | `false` | Only on `/solutions` and `/reject-reasons`; changes the response schema. |
| `group_by` | string | No | `grade` | Only on `/grade-mix`. Allowed values are not enumerated in the specification. |

The documentation does not state which record date is filtered, whether `start`
and `end` are inclusive, the timezone used, or how pagination completion is
signaled. A practical pagination strategy is to increment `offset` by `limit`
until an empty or short page is returned, but this behavior should be confirmed
with the API owner.

## Usage examples

### Health check

Observed request:

```bash
curl -X GET \
  'http://192.168.203.238:8800/health' \
  -H 'accept: application/json'
```

PowerShell equivalent:

```powershell
Invoke-RestMethod -Method Get -Uri "$TallyApiBaseUrl/health" -Headers @{ Accept = "application/json" }
```

Observed `200` response:

```json
{
  "status": "ok"
}
```

### List files

Observed default pagination request:

```bash
curl -X GET \
  'http://192.168.203.238:8800/files?limit=1000&offset=0' \
  -H 'accept: application/json'
```

Date-filtered example:

```bash
curl -X GET \
  'http://192.168.203.238:8800/files?start=2026-07-01&end=2026-07-31&limit=1000&offset=0' \
  -H 'accept: application/json'
```

Response shape:

```json
[
  {
    "file_id": 2,
    "filename": "string",
    "filename_date": "string",
    "report_datetime": "string"
  }
]
```

### Get one complete file

The screenshot shows a successful request for file ID `2`:

```bash
curl -X GET \
  'http://192.168.203.238:8800/files/2' \
  -H 'accept: application/json'
```

PowerShell equivalent:

```powershell
$FileId = 2
Invoke-RestMethod -Method Get -Uri "$TallyApiBaseUrl/files/$FileId" -Headers @{ Accept = "application/json" }
```

The response is a `FileDetail` object containing file metadata, an optional
summary, solutions, reject reasons, and detail lines. Values visible in the
screenshot include `board_input_cuft: 5.47`, `average_length_ft: 7.3`,
`edger_bd_ft: 50.2`, `trim_pass_count: 0`, `trim_pass_bd_ft: 0`,
`lumber_value: 47.85`, and `lumber_value_deducts: 46.91`.

Representative response shape:

```json
{
  "file_id": 2,
  "filename": "string",
  "filename_date": "string",
  "report_datetime": "string",
  "summary": {
    "time_start": "string",
    "time_run": "string",
    "time_no_production": "string",
    "board_input_pieces": 0,
    "board_input_cuft": 5.47,
    "average_length_ft": 7.3,
    "edger_bd_ft": 50.2,
    "trim_pass_count": 0,
    "trim_pass_bd_ft": 0,
    "lumber_value": 47.85,
    "lumber_value_deducts": 46.91,
    "recovery_lrf_bf_cm": 0,
    "recovery_bf_cf": 0,
    "fiber_ratio": 0
  },
  "solutions": [
    { "solution_number": 1, "board_count": 0 }
  ],
  "reject_reasons": [
    { "reason": "string", "count": 0 }
  ],
  "detail_lines": [
    {
      "wood_type": "string",
      "thickness": "string",
      "width": 0,
      "grade": "string",
      "length_ft": 0,
      "pieces": 0,
      "bd_ft": 0
    }
  ]
}
```

Except for the values explicitly identified as visible in the screenshot, this
example illustrates the schema and should not be interpreted as a complete
captured production response.

### Production summary

Observed request:

```bash
curl -X GET \
  'http://192.168.203.238:8800/production-summary?limit=1000&offset=0' \
  -H 'accept: application/json'
```

Date-filtered example:

```bash
curl -X GET \
  'http://192.168.203.238:8800/production-summary?start=2026-07-01&end=2026-07-31&limit=1000&offset=0' \
  -H 'accept: application/json'
```

Returns an array of `ProductionSummaryRow` objects.

### Recovery

Observed request:

```bash
curl -X GET \
  'http://192.168.203.238:8800/recovery?limit=1000&offset=0' \
  -H 'accept: application/json'
```

Date-filtered example:

```bash
curl -X GET \
  'http://192.168.203.238:8800/recovery?start=2026-07-01&end=2026-07-31&limit=1000&offset=0' \
  -H 'accept: application/json'
```

Returns an array of `RecoveryRow` objects.

### Solutions

This endpoint is present in the OpenAPI specification but was not shown in the
provided screenshots. The following requests are derived from the specification.

Per-file rows:

```bash
curl -X GET \
  'http://192.168.203.238:8800/solutions?totals=false&limit=1000&offset=0' \
  -H 'accept: application/json'
```

Aggregated totals:

```bash
curl -X GET \
  'http://192.168.203.238:8800/solutions?start=2026-07-01&end=2026-07-31&totals=true&limit=1000&offset=0' \
  -H 'accept: application/json'
```

With `totals=false`, the response is `SolutionRowOut[]`. With `totals=true`, it
is `SolutionTotalOut[]`.

### Reject reasons

Observed request:

```bash
curl -X GET \
  'http://192.168.203.238:8800/reject-reasons?totals=false&limit=1000&offset=0' \
  -H 'accept: application/json'
```

Aggregated totals example:

```bash
curl -X GET \
  'http://192.168.203.238:8800/reject-reasons?start=2026-07-01&end=2026-07-31&totals=true&limit=1000&offset=0' \
  -H 'accept: application/json'
```

With `totals=false`, the response is `RejectReasonRowOut[]`. With `totals=true`,
it is `RejectReasonTotalOut[]`.

### Grade mix

Observed request using the default grouping:

```bash
curl -X GET \
  'http://192.168.203.238:8800/grade-mix?group_by=grade' \
  -H 'accept: application/json'
```

Date-filtered example:

```bash
curl -X GET \
  'http://192.168.203.238:8800/grade-mix?start=2026-07-01&end=2026-07-31&group_by=grade' \
  -H 'accept: application/json'
```

Returns `GradeMixRow[]`. The specification accepts `group_by` as an unrestricted
string and only documents `grade` as its default; confirm other supported groupings
before relying on them.

## Response schemas

In the tables below, `nullable` means the property may be a JSON value of the
listed type or `null`. A property is required only where the OpenAPI schema marks
it as required.

### `FileOut`

Returned by `GET /files`.

| Property | Type | Required |
|---|---|---:|
| `file_id` | integer | Yes |
| `filename` | string | Yes |
| `filename_date` | string | Yes |
| `report_datetime` | string | Yes |

### `FileDetail`

Returned by `GET /files/{file_id}`.

| Property | Type | Required |
|---|---|---:|
| `file_id` | integer | Yes |
| `filename` | string | Yes |
| `filename_date` | string | Yes |
| `report_datetime` | string | Yes |
| `summary` | `SummaryOut` or null | No |
| `solutions` | `SolutionOut[]` | Yes |
| `reject_reasons` | `RejectReasonOut[]` | Yes |
| `detail_lines` | `DetailLineOut[]` | Yes |

### `SummaryOut`

All properties are optional and nullable.

| Property | Type |
|---|---|
| `time_start` | string or null |
| `time_run` | string or null |
| `time_no_production` | string or null |
| `board_input_pieces` | integer or null |
| `board_input_cuft` | number or null |
| `average_length_ft` | number or null |
| `edger_bd_ft` | number or null |
| `trim_pass_count` | integer or null |
| `trim_pass_bd_ft` | number or null |
| `lumber_value` | number or null |
| `lumber_value_deducts` | number or null |
| `recovery_lrf_bf_cm` | number or null |
| `recovery_bf_cf` | number or null |
| `fiber_ratio` | number or null |

### `DetailLineOut`

All properties are required.

| Property | Type |
|---|---|
| `wood_type` | string |
| `thickness` | string |
| `width` | number |
| `grade` | string |
| `length_ft` | integer |
| `pieces` | integer |
| `bd_ft` | number |

### `ProductionSummaryRow`

`file_id`, `filename`, and `report_datetime` are required. All other properties
are optional and nullable.

| Property | Type |
|---|---|
| `file_id` | integer |
| `filename` | string |
| `report_datetime` | string |
| `time_start` | string or null |
| `time_run` | string or null |
| `time_no_production` | string or null |
| `board_input_pieces` | integer or null |
| `board_input_cuft` | number or null |
| `average_length_ft` | number or null |
| `edger_bd_ft` | number or null |
| `trim_pass_count` | integer or null |
| `trim_pass_bd_ft` | number or null |
| `lumber_value` | number or null |
| `lumber_value_deducts` | number or null |

### `RecoveryRow`

| Property | Type | Required |
|---|---|---:|
| `file_id` | integer | Yes |
| `report_datetime` | string | Yes |
| `recovery_lrf_bf_cm` | number or null | No |
| `recovery_bf_cf` | number or null | No |
| `fiber_ratio` | number or null | No |

### Solution schemas

All listed properties are required.

| Schema | Property | Type |
|---|---|---|
| `SolutionOut` | `solution_number` | integer |
| `SolutionOut` | `board_count` | integer |
| `SolutionRowOut` | `file_id` | integer |
| `SolutionRowOut` | `report_datetime` | string |
| `SolutionRowOut` | `solution_number` | integer |
| `SolutionRowOut` | `board_count` | integer |
| `SolutionTotalOut` | `solution_number` | integer |
| `SolutionTotalOut` | `total_board_count` | integer |

### Reject-reason schemas

All listed properties are required.

| Schema | Property | Type |
|---|---|---|
| `RejectReasonOut` | `reason` | string |
| `RejectReasonOut` | `count` | integer |
| `RejectReasonRowOut` | `file_id` | integer |
| `RejectReasonRowOut` | `report_datetime` | string |
| `RejectReasonRowOut` | `reason` | string |
| `RejectReasonRowOut` | `count` | integer |
| `RejectReasonTotalOut` | `reason` | string |
| `RejectReasonTotalOut` | `total_count` | integer |

### `GradeMixRow`

`total_pieces` and `total_bd_ft` are required. Grouping fields are optional and
nullable, presumably depending on the requested grouping.

| Property | Type | Required |
|---|---|---:|
| `grade` | string or null | No |
| `thickness` | string or null | No |
| `width` | number or null | No |
| `length_ft` | integer or null | No |
| `total_pieces` | integer | Yes |
| `total_bd_ft` | number | Yes |

## Validation errors

Collection endpoints and `GET /files/{file_id}` document HTTP `422` for invalid
parameters. The response schema is `HTTPValidationError`:

```json
{
  "detail": [
    {
      "loc": ["query", "limit"],
      "msg": "string",
      "type": "string",
      "input": null,
      "ctx": {}
    }
  ]
}
```

`ValidationError.loc` is an array of strings and/or integers. `msg` and `type`
are required; `input` and `ctx` are optional. The specification does not document
other likely statuses such as `404`, `500`, or connection failures.

## Implementation notes and documentation gaps

- The OpenAPI document has no `servers` entry. The base URL in this reference is
  taken from the provided screenshots.
- No authentication mechanism or security requirement is declared. Do not assume
  the API is safe to expose outside its intended private network.
- `filename_date`, `report_datetime`, and time properties are typed only as strings;
  their exact serialized formats and timezone are not specified.
- The meanings and units of several domain fields are suggested by their names
  (`cuft`, `bd_ft`, `length_ft`) but are not formally defined.
- There is no documented total-row count, next-page link, ordering guarantee, or
  rate limit.
- `totals=true` changes the element schema for `/solutions` and `/reject-reasons`.
- The `/health` OpenAPI response schema is empty even though the screenshot shows
  `{ "status": "ok" }`.
- Only `grade` is known for `group_by`; other accepted values are undocumented.

These gaps should be confirmed with the API owner before building behavior that
depends on date boundaries, ordering, alternative grade-mix groupings, or public
network access.
