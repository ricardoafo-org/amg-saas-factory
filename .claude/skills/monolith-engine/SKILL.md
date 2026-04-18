# monolith-engine

Core runtime standards for the AMG SaaS Factory's schema-driven, chatbot-capable monolith.
Uses Progressive Disclosure — read only the section relevant to your task.

---

## 1. Schema-Driven Architecture

JSON Schema is the single source of truth. Every collection, form, and API contract derives from it.

```
src/
  schemas/                — JSON Schema definitions (committed, versioned)
    {collection}.schema.json
  lib/
    schema-loader.ts      — loads + caches schemas at startup
    zod-from-schema.ts    — converts JSON Schema → Zod validator at build time
```

**Rule:** Never write a Zod schema by hand. Generate it from `{collection}.schema.json` via `zod-from-schema.ts`. This keeps UI generation, validation, and DB shape in sync from one file.

> **Proposed improvement:** Add a `npm run schemas:sync` script that diffs your JSON Schemas against the live PocketBase collection definitions and exits non-zero on mismatch. Catches schema drift before runtime.

---

## 2. PocketBase Standard

Single-binary deployment. SQLite in WAL mode is the target for 10k+ concurrent read connections.

```sh
# Start PocketBase with WAL mode (set in pb_data/data.db pragma on first run)
./pocketbase serve --http="0.0.0.0:8090"
```

PocketBase enables WAL automatically for new databases. Verify with:
```sql
PRAGMA journal_mode; -- should return "wal"
```

**Rules:**
- All queries go through the PocketBase JS SDK — never raw SQL in app code
- Use `pb.collection('x').getList()` with explicit `filter` scoped to `tenant_id`
- MCP `pocketbase` tool is for inspection only — never run mutations from Claude's MCP session

> **Proposed improvement:** Add a `pb_migrations/` folder with version-controlled PocketBase migration scripts. PocketBase doesn't have built-in migrations, so a simple numbered `.json` export per collection + a `migrations:apply` script prevents schema loss on redeploy.

---

## 3. Type Safety

All API inputs and outputs are validated end-to-end.

```ts
// src/lib/zod-from-schema.ts pattern
import schema from '@/schemas/booking.schema.json';
import { z } from 'zod';

export const BookingSchema = jsonSchemaToZod(schema); // generated, not hand-written
export type Booking = z.infer<typeof BookingSchema>;
```

**Rules:**
- Server Actions: validate with `BookingSchema.parse(formData)` before touching PocketBase
- API Routes: validate request body with `Schema.safeParse()`, return 400 on failure
- Never use `any` — if a PocketBase record type is unknown, define it in `types/pb.ts`

> **Proposed improvement:** Use `zod-to-json-schema` in reverse for any Zod types that predate the JSON Schema — run once to bootstrap, then treat JSON Schema as the source going forward.

---

## 4. Chatbot Core

Rule-based flow engine. Logic is data, not code.

```
pb_data/                        — gitignored PocketBase data
~/.pb_tenant/{tenantId}/        — tenant-specific config dir
  chatbot_flow.json             — flow definition for this tenant
```

`chatbot_flow.json` shape:
```json
{
  "version": 1,
  "start": "welcome",
  "nodes": {
    "welcome": {
      "message": "{{config.greeting}}",
      "options": [
        { "label": "Book appointment", "next": "booking" },
        { "label": "Check prices", "next": "pricing" }
      ]
    },
    "booking": { "action": "collect_booking_form", "next": "confirm" }
  }
}
```

**Rules:**
- All user-facing strings use `{{config.key}}` tokens — resolved at runtime from the `config` PocketBase collection for that tenant
- Flow nodes trigger named actions (`collect_booking_form`, `send_confirmation`) — actions are registered handlers in `src/lib/chatbot/actions/`, never inline logic
- The engine (`src/lib/chatbot/engine.ts`) is stateless — state lives in the session, not the engine

> **Proposed improvement:** Version the `chatbot_flow.json` format (already has `"version": 1`). Add a `validateFlow(json)` function using JSON Schema that runs at tenant config load time, so malformed flows fail loudly at startup rather than silently mid-conversation.

---

## 5. Anti-Patterns

These are hard rules — raise an error in code review if you see them:

| Anti-pattern | Why | Fix |
|---|---|---|
| `const price = 49.99` hardcoded | Breaks multi-tenancy; prices differ per tenant | Fetch from `config` collection: `pb.collection('config').getFirstListItem('key="service_price"')` |
| `if (tenant === 'acme-corp')` | Tenant-specific logic in core | Move to tenant `chatbot_flow.json` or `config` collection |
| Hand-written Zod schema | Drifts from JSON Schema | Generate from `{collection}.schema.json` |
| Direct SQLite access | Bypasses PocketBase auth/rules | Use PocketBase SDK always |
| Mutations via MCP pocketbase tool | Untracked, unreviewed changes | All mutations via Server Actions or SDK in code |
