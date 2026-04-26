# FEAT-050 — Signed Records & Legal Trail

> Sub-FEAT of FEAT-037. The tamper-evident audit chain that turns LOPDGDD + RD 1457/1986 compliance from "we promise" to "we can prove".

## Intent

The Spanish auto-workshop legal context is unforgiving:

- **RD 1457/1986**: written quote (presupuesto) before any repair, with mandatory IVA breakdown, 12 working-day validity, and warranty terms (3 months / 2,000 km minimum).
- **LOPDGDD**: every personal-data write needs a recorded consent, queryable on demand by Agencia Española de Protección de Datos.
- **Hacienda**: invoices must be retained 4 years and made available to inspectors.

Today we *log* events into `audit_log` (FEAT-046) and `consent_log`. That is good UX hygiene. It is **not** evidence — a malicious admin or a sloppy migration can rewrite rows.

FEAT-050 turns the existing `audit_log` into a **tamper-evident hash chain**: each row stores `prev_hash` and `entry_hash = sha256(prev_hash || canonical(row))`. A daily anchor stamps the chain head into a separate `audit_anchor` collection (which is also append-only by collection rule). An inspector-facing endpoint `/admin/legal/verify` recomputes the chain end-to-end and renders a green/red status. Quotes and consent acceptances additionally get a printable receipt with their entry hash and chain anchor — paper-friendly, inspector-friendly.

## Acceptance Criteria

1. [ ] `audit_log` collection (created in FEAT-046) extended with two fields: `prev_hash` (string, 64 hex chars), `entry_hash` (string, 64 hex chars). Migration backfills existing rows in one pass with the canonical hash function.
2. [ ] Server-side helper `chainAuditEntry(row)` runs INSIDE the `withAudit` wrapper (FEAT-046): reads the latest entry's `entry_hash` for the tenant (with a row-lock pattern using PB filter + insert + check race), computes `entry_hash`, persists the row.
3. [ ] Canonical row serialization: stable JSON key order, ISO-8601 dates, no whitespace, deterministic across Node versions. Function `canonicalize(row)` defined and unit-tested.
4. [ ] Race protection: if two concurrent writes both think they're following entry N, the second to commit detects the conflict (its `prev_hash` no longer matches the latest) and retries up to 3 times before failing the parent action. Tested under concurrent load.
5. [ ] New collection `audit_anchor` with fields: `tenant_id`, `chain_head_hash`, `chain_length` (count of rows at anchor time), `anchored_at`, `signature` (HMAC-SHA256 of `chain_head_hash` with a tenant-scoped secret in `config.audit.anchor_secret`). Append-only by collection rule.
6. [ ] Daily cron in `pb_hooks/audit-anchor.pb.js` runs at 03:00 Europe/Madrid and writes one anchor per active tenant.
7. [ ] Inspector endpoint `/admin/legal/verify` (owner role only): recomputes the entire chain for the current tenant, compares to recorded hashes, and renders:
   - ✅ "Cadena íntegra. {N} entradas verificadas. Última anchor: {fecha}."
   - ❌ "Anomalía detectada en la entrada #{i} ({entity_type}/{entity_id}). Llamar a soporte." (with the affected row range)
8. [ ] Verification runs in chunks of 1,000 rows with progress indicator; full chain of 50,000 rows verifies in < 5 seconds on a developer laptop.
9. [ ] **Quote receipt**: every quote PDF/HTML print view (existing in FEAT-017) gets a footer block: `Sello legal: {entry_hash[:16]}... · Anclaje: {chain_head[:16]}... ({anchor_date})`. The block also includes the legally-required RD 1457/1986 disclosures (validity, IVA, warranty).
10. [ ] **Consent receipt**: every `consent_log` write triggers an email receipt to the customer (if email present + consented to receive receipts) with the consent details + entry hash. LOPDGDD evidence.
11. [ ] **Warranty record**: completion of a work order writes a `warranty_record` row with: `tenant_id`, `customer_id`, `vehicle_id`, `work_order_id`, `services_covered`, `valid_until_date` (delivered + 3 months), `valid_until_km` (delivered_km + 2,000), `quote_entry_hash` (back-reference into the chain). Also chained.
12. [ ] Customer 360 (FEAT-046) shows a "Garantías activas" section listing active warranty records with countdown.
13. [ ] All tenant-scoped: cross-tenant verify is impossible by collection rule; even an owner cannot verify another tenant's chain.
14. [ ] Tampering simulation test: a Vitest test injects a forged update directly to a PB row, then runs verify, asserts the endpoint reports the anomaly at the correct index.
15. [ ] Castilian Spanish copy throughout, inspector-friendly register on `/admin/legal/verify`.
16. [ ] Feature flag `config.feature_flags.signedRecords` (default `false` for new tenants; `true` for `talleres-amg` only after FEAT-046 stabilises in production for at least 7 days).

## Constraints

- **No blockchain**. Hash chain + HMAC anchor is sufficient and explainable to a non-technical inspector.
- **No third-party notary**. Anchors live in our own append-only collection; if higher assurance is later required, anchors can be additionally posted to a public service — out of scope here.
- **`audit_anchor` and chained `audit_log` rules**: PB collection rules deny update + delete to all clients (only the `pb_hooks` daemon and `withAudit` server-side process can write). Tested.
- **Tenant**: every read scoped by `tenant_id`; chain_head per tenant.
- **Performance**: chain insert overhead < 5 ms per audit_log row; verification < 100 µs per row.
- **Anchor secret rotation**: `config.audit.anchor_secret` rotation procedure documented in `docs/contracts/audit-chain.md`. Old anchors remain verifiable with the corresponding old secret stored in `audit_anchor.signature_key_id`.
- **Inspector access**: `/admin/legal/verify` does NOT expose row contents — only counts, hashes, dates. Personal data not leaked to the verification screen.

## Out of Scope

- Public on-chain anchoring (e.g. Bitcoin OP_RETURN). Future work if a customer requests it.
- Cryptographic signatures from a hardware key. Future.
- Inspector login (give an external inspector limited credentials). Owner exports a verification report PDF instead.
- Retention / archival of audit_log rows older than 24 months. Out of scope; may need a separate cold-storage spec.
- Currency or invoice generation. We chain quote rows; invoices are not yet a domain object.

## Test Cases

| Scenario | Input | Expected output |
|---|---|---|
| First entry | Empty chain, first row | `prev_hash = ZERO_HASH`, `entry_hash = sha256(ZERO_HASH || canonical(row))` |
| Append | Existing chain length N, new row | `prev_hash` = previous `entry_hash`; chain length N+1 |
| Concurrent append | Two simultaneous writes | One commits, the other retries; final chain consistent |
| Daily anchor | Cron at 03:00 | One `audit_anchor` row per active tenant; `chain_head_hash` matches latest entry hash |
| Verify clean | Untouched chain of 200 rows | ✅ "Cadena íntegra" |
| Verify tampered (update) | Manually flip a field on row 47 | ❌ pinpoints row 47 |
| Verify tampered (insert) | Insert a forged row between 100 and 101 | ❌ pinpoints the break |
| Verify tampered (delete) | Delete row 73 | ❌ pinpoints the gap |
| Quote receipt | Print/email a quote | Receipt footer shows entry_hash + anchor + RD 1457/1986 disclosures |
| Consent receipt email | Customer toggles marketing_consent | Receipt email contains consent details + entry_hash |
| Warranty record on WO complete | Mark WO as delivered | warranty_record row created with valid_until_date and valid_until_km |
| Customer 360 warranty list | Customer with 2 active warranties | Section shows both with correct countdowns |
| Tenant isolation | Owner of tenant A tries to verify tenant B's chain | 403 (collection rule) |
| Anchor secret rotation | Rotate, verify chain after | New anchors signed with new key; old anchors still verify |
| Performance | 50,000 row chain | Verify < 5 seconds, anchor cron < 1 second per tenant |
| A11y on verify page | Screen reader on verify result | Announces ✅/❌ status + summary clearly |

## Files to Touch

- [ ] `pb_migrations/2026XX_audit_log_add_chain_fields.json` — add `prev_hash`, `entry_hash`
- [ ] `pb_migrations/2026XX_create_audit_anchor.json` — anchor collection
- [ ] `pb_migrations/2026XX_create_warranty_record.json` — warranty collection
- [ ] `pb_migrations/2026XX_audit_log_rules_lock.json` — deny client update/delete
- [ ] `src/lib/audit/canonical.ts` — canonical JSON serializer
- [ ] `src/lib/audit/chain.ts` — `chainAuditEntry`, retry logic
- [ ] `src/lib/audit/verify.ts` — chain verification engine
- [ ] `src/lib/audit/anchor.ts` — anchor write + HMAC sign
- [ ] `src/lib/audit/withAudit.ts` — UPDATE: invoke `chainAuditEntry` after delta computation
- [ ] `pb_hooks/audit-anchor.pb.js` — daily cron
- [ ] `src/app/(admin)/admin/legal/verify/page.tsx` — inspector verification page
- [ ] `src/actions/admin/legal.ts` — `verifyChain()`, `getActiveWarranties()`
- [ ] `src/actions/admin/quotes.ts` — extend `sendQuote` to include hash + anchor in receipt template
- [ ] `src/actions/admin/work-orders.ts` — extend `markDelivered` to write warranty_record
- [ ] `src/core/components/admin/QuoteReceiptFooter.tsx` — legal footer block
- [ ] `src/core/components/admin/WarrantySection.tsx` — Customer 360 section
- [ ] `src/lib/email/templates/consent-receipt.tsx` — React Email template
- [ ] `clients/talleres-amg/config.json` — `feature_flags.signedRecords: true`, `audit.anchor_secret`
- [ ] `tests/unit/audit/canonical.test.ts`
- [ ] `tests/unit/audit/chain.test.ts`
- [ ] `tests/unit/audit/verify-tampering.test.ts` — simulates tampering at update/insert/delete
- [ ] `tests/e2e/admin/legal-verify.spec.ts`
- [ ] `docs/contracts/audit-chain.md` — protocol contract + secret rotation procedure
- [ ] `docs/contracts/legal-trail.md` — what we promise to inspectors and how

## PR Sequencing

1. **PR 1** — `feat(audit): hash chain in withAudit + canonical serialization + retry`. Branch: `feature/feat-050-chain`. Files: canonical, chain, withAudit update, migrations, unit tests including tamper simulation.
2. **PR 2** — `feat(audit): daily anchor cron + audit_anchor collection + verify engine`. Branch: `feature/feat-050-anchor-verify`. Files: anchor lib, cron hook, verify lib, anchor migration.
3. **PR 3** — `feat(admin): /admin/legal/verify page + quote receipt footer + warranty records + Customer 360 section + E2E`. Branch: `feature/feat-050-receipts`. Files: verify page, receipt component, warranty migration + writer, Customer 360 section, contracts docs, Playwright suite.

## Dependencies

- Depends on FEAT-046 (audit_log + withAudit), FEAT-017 (quote send flow), FEAT-018 (consent email infra), FEAT-016 (Customer 360 component slot).
- No downstream sub-FEATs.

## Builder-Validator Checklist

- [ ] All chain reads/writes scoped to `tenant_id`
- [ ] `audit_log` and `audit_anchor` PB rules deny client update/delete (verified in CI)
- [ ] No PII on `/admin/legal/verify` page
- [ ] Hash chain insertion retries on concurrent commit (tested under load)
- [ ] Tampering simulation test passes (correctly detects at right index)
- [ ] RD 1457/1986 disclosures present in quote receipt footer
- [ ] LOPDGDD: consent_receipt email uses opt-in only
- [ ] Warranty record fields match RD 1457/1986 minima (3 months / 2,000 km)
- [ ] Castilian Spanish copy
- [ ] Feature flag respected
- [ ] `npm run type-check` / `npm test` / `npm run lint` / Playwright clean
