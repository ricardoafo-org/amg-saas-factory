# FEAT-045 — Universal Data Table Primitive

> Sub-FEAT of FEAT-037. The single accessible, virtualized, density-tunable table component every admin list will use.

## Intent

FEAT-016, FEAT-017, FEAT-019 each ship their own table (`CustomerTable`, `VehicleTable`, `QuoteKanban`'s list fallback, top-customers table in reports). They diverge in keyboard navigation, sorting, sticky headers, density, empty states, and column visibility. Adding a new admin page today means re-implementing all of that. Worse — accessibility regressions ride the same divergence: one table is screen-reader friendly, the next is not.

This sub-FEAT introduces `<DataTable>` — one headless-but-styled primitive built on **TanStack Table v9**. Every existing admin table migrates to it (in subsequent sub-FEATs), and every new table starts from it. Column virtualization (via `@tanstack/react-virtual`) handles 10,000-row datasets without breaking a sweat. Keyboard navigation is full Excel-style (arrow keys move cell focus, Tab cycles columns, Enter opens the row). WCAG 2.1 AA on every page that consumes it.

## Acceptance Criteria

1. [ ] `<DataTable<TRow>>` component accepts: `data: TRow[]`, `columns: ColumnDef<TRow>[]`, `getRowId: (row) => string`, `onRowClick?: (row) => void`, `density?: 'compact' | 'comfortable' | 'spacious'`, `emptyState?: ReactNode`, `loadingState?: ReactNode`, `virtualizeAfter?: number` (default 100).
2. [ ] When `data.length > virtualizeAfter`, rows render via `@tanstack/react-virtual` with a 600 px viewport by default; scroll is smooth on a 60 Hz display.
3. [ ] Sticky header. Header cells stay pinned during vertical scroll. Horizontal scroll is allowed when columns overflow on narrow viewports.
4. [ ] Column sort: click header to cycle `asc → desc → none`; visual chevron indicates state; sort is server-side when a `serverSort` prop is provided, client-side otherwise.
5. [ ] Column visibility menu in toolbar — checkbox list of all columns; visibility persisted to `localStorage` keyed by table ID + staff ID.
6. [ ] Density toggle in toolbar — three icons (compact / comfortable / spacious); choice persisted likewise.
7. [ ] Filter chips in toolbar (one per filter slot defined by parent); chips show active filter, click to remove, "Limpiar todo" clears all.
8. [ ] Keyboard navigation: arrow keys move focus between cells; Home / End jump to row start/end; PgUp / PgDn page through; Enter on a row triggers `onRowClick`; `/` focuses the toolbar's quick-filter input.
9. [ ] Screen reader: full `<table>` semantics with `aria-rowcount`, `aria-colcount`, `aria-rowindex`, `aria-sort` on sortable headers. Row-click is also exposed as an `<button>` overlay for AT users.
10. [ ] Empty state: when `data.length === 0`, render the `emptyState` prop (or a default illustration + helpful copy). Empty-state copy and CTA per consumer.
11. [ ] Loading state: when `loading` prop is `true`, render skeleton rows (5 by default) instead of empty.
12. [ ] Selection mode (opt-in): `selectable: 'single' | 'multi'` adds checkbox column; selected rows expose via `onSelectionChange`. Multi-select shows a sticky bulk-action bar at the bottom.
13. [ ] Row actions (opt-in): `rowActions: (row) => ReactNode` renders a per-row action cell (typically a kebab menu).
14. [ ] CSV export utility `exportTableCsv(data, columns, filename)` reused across reports.
15. [ ] Performance: 1,000-row dataset renders + scrolls at 60 fps in Chrome on a 2020 MacBook Air. Initial paint < 200 ms.
16. [ ] Castilian Spanish for all built-in copy (toolbar, density labels, "Limpiar todo", empty state default).
17. [ ] No new external dependencies beyond `@tanstack/react-table` and `@tanstack/react-virtual` (both 2026 stable).

## Constraints

- **No styled component library**. Tailwind v4 + `cn()` helper only. The component owns its CSS.
- **Headless first**. TanStack handles state; we own rendering. No prebuilt skin from `mui` / `mantine` / `shadcn-table`.
- **Tenant**: not directly touched by this primitive — consumers pass already-scoped data.
- **Accessibility**: WCAG 2.1 AA non-negotiable; CI lint runs `axe` against the Storybook stories for this component.
- **Storybook required**. Each variant (loading, empty, sorted, virtualized, selectable, with-row-actions) gets a story.

## Out of Scope

- Drag-to-reorder rows or columns. Out of scope for v1.
- Inline editing inside cells. Inline edits ship in FEAT-047 as a separate primitive that *wraps* a cell.
- Server-driven pagination component. We expose `pagination` via TanStack — consumers wire it; no AMG-branded paginator in v1.
- Treeview / grouping. Future work.

## Test Cases

| Scenario | Input | Expected output |
|---|---|---|
| Render 60 rows | Customers list, no virtualization | All 60 rows in DOM, no scroll required on desktop |
| Render 5,000 rows | Synthetic large dataset, virtualizeAfter=100 | Only ~30 row nodes in DOM at any time; scroll fps stable |
| Sort by column | Click "Última visita" header twice | Rows resort asc, then desc; chevron updates; `aria-sort` reflects state |
| Hide column | Open visibility menu, uncheck "Email" | Email column disappears, persists across reload |
| Density change | Toggle to `compact` | Row height shrinks, persisted |
| Empty state | `data: []` with custom emptyState | Custom CTA renders |
| Loading state | `loading: true` | 5 skeleton rows render with shimmer |
| Keyboard nav | Arrow Down 3 times | Focus moves down 3 rows; `aria-rowindex` correct |
| Enter on row | Focus a row, press Enter | `onRowClick` invoked with that row |
| Multi-select | Check 3 rows | Bulk action bar appears with "3 seleccionados" |
| CSV export | Click export | File downloads with correct columns and Castilian Spanish headers |
| A11y | axe-core on full table | Zero violations |
| WCAG colour contrast | Inspect headers + body text | Contrast ratio ≥ 4.5:1 for normal text |

## Files to Touch

- [ ] `src/core/components/data-table/DataTable.tsx` — main primitive
- [ ] `src/core/components/data-table/DataTableToolbar.tsx` — toolbar (filters, density, visibility, search, export)
- [ ] `src/core/components/data-table/DataTableHeader.tsx` — sticky header with sort chevrons
- [ ] `src/core/components/data-table/DataTableBody.tsx` — virtualized body renderer
- [ ] `src/core/components/data-table/DataTableEmpty.tsx` — default empty illustration + copy
- [ ] `src/core/components/data-table/DataTableSkeleton.tsx` — loading skeleton
- [ ] `src/core/components/data-table/DataTableBulkBar.tsx` — sticky bulk action bar
- [ ] `src/core/components/data-table/useDataTablePersistedState.ts` — localStorage-backed visibility/density persistence
- [ ] `src/core/components/data-table/exportTableCsv.ts` — CSV utility
- [ ] `src/core/components/data-table/types.ts` — exported `ColumnDef<T>` re-exports + AMG extensions
- [ ] `src/core/components/data-table/__stories__/DataTable.stories.tsx` — Storybook variants
- [ ] `src/core/components/data-table/__tests__/DataTable.test.tsx` — Vitest + Testing Library
- [ ] `tests/e2e/admin/data-table-keyboard.spec.ts` — Playwright keyboard navigation suite
- [ ] `package.json` — add `@tanstack/react-table` and `@tanstack/react-virtual`

## PR Sequencing

1. **PR 1** — `feat(ui): DataTable primitive (render + sort + sticky header)`. Branch: `feature/feat-045-data-table-core`. Files: core component, header, body (no virtualization yet), Storybook scaffold.
2. **PR 2** — `feat(ui): DataTable virtualization + density + visibility persistence`. Branch: `feature/feat-045-virtualization`. Files: virtualization, toolbar density/visibility, persistence hook.
3. **PR 3** — `feat(ui): DataTable selection + bulk bar + row actions + CSV export`. Branch: `feature/feat-045-selection-export`. Files: selection, bulk bar, row actions, CSV.
4. **PR 4** — `test(ui): DataTable a11y + keyboard E2E + axe-clean`. Branch: `feature/feat-045-a11y`. Files: Playwright suite, axe assertions, screen-reader smoke notes.

## Dependencies

- Depends on FEAT-043 (loaded fixtures for stories and tests).
- Required by FEAT-046 (Customer 360 uses DataTable for service history), all future list pages.

## Builder-Validator Checklist

- [ ] No tenant data leaks — primitive is data-agnostic
- [ ] WCAG 2.1 AA: axe-core zero violations on every Storybook variant
- [ ] Keyboard navigation matches spec exactly
- [ ] Castilian Spanish for built-in copy
- [ ] No hardcoded colours — all via Tailwind tokens
- [ ] `npm run type-check` / `npm test` / `npm run lint` clean
- [ ] Playwright keyboard suite green
- [ ] Storybook builds clean
