# PocketBase Migrations

PocketBase has no built-in migration runner. This folder holds versioned collection exports so schema changes are tracked and replayable.

## Convention

Files are named `{timestamp}_{description}.json` and contain a full PocketBase collection export (from Admin UI → Settings → Export collections).

```
pb_migrations/
  20260418_initial_collections.json
  20260420_add_chatbot_flow.json
```

## Apply migrations

```sh
npm run migrations:apply
```

This script imports each file in order into a running PocketBase instance via the Admin API. Idempotent — already-applied collections are skipped (matched by collection ID).

## Create a migration snapshot

After making schema changes in the Admin UI:

1. Admin UI → Settings → Export collections → download JSON
2. Rename to `{YYYYMMDD}_{description}.json`
3. Place in this folder and commit
