# factory-core

Standards and patterns for the AMG SaaS Factory stack: **Next.js 15 · Tailwind v4 · PocketBase**.

Uses Progressive Disclosure — read only the section relevant to your task.

---

## 1. Stack Versions & Constraints

- **Next.js 15** — App Router only. No Pages Router. Use `async` Server Components by default; add `'use client'` only when unavoidable (event handlers, hooks, browser APIs).
- **Tailwind v4** — CSS-first config (`@theme` in globals.css, no `tailwind.config.js`). Use design tokens via `--color-*`, `--font-*` CSS variables. No arbitrary values unless truly one-off.
- **PocketBase** — single-binary backend. Collections are the schema. No raw SQL. All queries through the PocketBase JS SDK (`pb.collection('x').getList(...)`).
- **TypeScript strict mode** — `strict: true`, no `any`, no type assertions without a comment explaining why.

---

## 2. Multi-Tenancy

Every tenant is isolated by a `tenant_id` field on all PocketBase collections.

```ts
// Always scope queries — never query without tenant context
const records = await pb.collection('projects').getList(1, 50, {
  filter: `tenant_id = "${ctx.tenantId}"`
});
```

- Tenant context lives in the session (httpOnly cookie → server action → passed explicitly, never from client)
- PocketBase collection rules must enforce tenant isolation at the DB layer as a second line of defense
- The `architect` agent verifies schema decisions; invoke it before creating new collections

---

## 3. File Conventions

```
src/
  app/                  — Next.js App Router (layouts, pages, loading, error)
  components/           — Shared UI (Server Components unless noted)
  components/client/    — Client Components ('use client' at top)
  lib/                  — Pure utilities, no framework imports
  lib/pb.ts             — PocketBase singleton (server-only)
  lib/auth.ts           — Session helpers
  actions/              — Server Actions (named exports, never default)
  types/                — Shared TypeScript types, no runtime code
```

---

## 4. Server Actions

```ts
'use server';
import { getTenantCtx } from '@/lib/auth';

export async function createProject(formData: FormData) {
  const ctx = await getTenantCtx(); // throws if unauthenticated
  // validate → execute → revalidatePath
}
```

- Always validate input with Zod before touching PocketBase
- Always call `revalidatePath` or `revalidateTag` after mutations
- Never return raw PocketBase errors to the client — map to safe messages

---

## 5. Component Patterns

```tsx
// Server Component (default)
export default async function ProjectList({ tenantId }: { tenantId: string }) {
  const projects = await getProjects(tenantId);
  return <ul>{projects.map(p => <ProjectCard key={p.id} project={p} />)}</ul>;
}

// Client Component (only when needed)
'use client';
export function DeleteButton({ id }: { id: string }) {
  // event handler requires 'use client'
}
```

---

## 6. Security Gates

Before any merge, invoke the `security-auditor` agent:
- No PII in logs or error responses
- All PocketBase queries tenant-scoped
- Auth via httpOnly cookies only
- LOPDGDD erasure path exists for user data

---

## 7. MCP Tools Available

- **mysql** — direct DB queries for debugging/migration (not for app queries — use PocketBase SDK)
- **memory** — persist multi-tenant business logic, schema decisions, and cross-session context
