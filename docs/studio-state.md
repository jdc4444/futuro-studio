# Studio State API

`/front/api/state` is the canonical private state service for Studio tools.

Each write is an idempotent operation with up to 50 mutations. A mutation is a source, entity type, entity id, field and JSON value. Clients generate one stable `operationId` per user gesture, post it, then poll `GET /front/api/state?source=<source>&since=<unix-ms>` while visible. The server returns only later changes, so another machine sees the same state without Git commits or browser-local state becoming authoritative.

The first adapters should map the existing source files as follows:

- `tiles`: heart, remove, fill, posted and carousel fields from `data/curation.json` and carousel plans.
- `lookbook`: curation levels and key-image fields from `data/curation.json`.
- `references`: liked and removed fields from `data/curation.json`.
- `graph`: image/person marks from `data/graph-curation.json`.

GitHub remains the portable source/media mirror. A future exporter can write database snapshots back to each source repository for audit and offline recovery; it is not the live write path.
