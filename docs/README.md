# Living Docs — AMG SaaS Factory

This directory is the single source of truth for project knowledge that isn't expressible in code.

## Sections

| Dir | Purpose | Owner |
|---|---|---|
| [`bugs/`](bugs/) | Active bug reports filed by QA agent or devs | QA agent → Implementer |
| [`adr/`](adr/) | Architecture Decision Records — permanent decisions with context | Architect agent |
| [`decisions/`](decisions/) | Lighter decisions, experiments, reversible choices | Orchestrator |
| [`qa-reports/`](qa-reports/) | QA run summaries — one file per session | QA agent |

## Bug lifecycle

```
filed (QA agent) → triaged (orchestrator) → assigned (implementer) → fixed → verified (QA agent) → closed
```

Files stay in `docs/bugs/` until verified. Prefix filename with status:
- `open-` — needs fixing
- `wip-` — implementer is working on it  
- `fixed-` — fix merged, pending QA verification
- `closed-` — verified, archived here for reference

## ADR lifecycle

ADRs are **permanent**. Never delete. Status evolves:
- `proposed` → `accepted` → (optionally) `superseded by ADR-XXX`

## Migration plan

As the project grows: migrate `docs/bugs/` to GitHub Issues via `gh issue create`. The markdown format is compatible (title, body, labels).
