# MCP & AI Tooling Research — AMG SaaS Factory

**Date:** 2026-04-25 · **Author:** architect briefing · **Scope:** address 7 concrete pain points without breaking GDPR/LOPDGDD posture.

---

## Part A — MCP servers

### 1. GitHub MCP (official, `github/github-mcp-server`) — RECOMMENDED
- **What:** Native PR/Issue/Actions/Checks API surface for the agent.
- **Pains addressed:** 1 (premature auto-merge), 3 (manual chain coordination), 4 (no structured PR review summary), 7 (spec→PR traceability via issue links).
- **Install:** `claude mcp add github -- docker run -i --rm -e GITHUB_PERSONAL_ACCESS_TOKEN ghcr.io/github/github-mcp-server` (or remote `https://api.githubcopilot.com/mcp/`).
- **Trade-off:** Replaces the stitched `gh` shell calls with structured tool calls — `compliance-reviewer` can post review-with-comments atomically, and a branch-protection check can BLOCK merge until `security-auditor` posts an approving review. Cost: PAT scope sprawl; keep using `rafo-claude-bot` only.

### 2. Sentry MCP (official, `@sentry/mcp-server`) — RECOMMENDED
- **What:** Read issues, stack traces, releases; attach to bug reports automatically.
- **Pains addressed:** Indirect on 5 (noisy tests get correlated to real prod errors), and feeds `qa-engineer` with reproducible signals.
- **Install:** `claude mcp add sentry --transport http https://mcp.sentry.dev/mcp` (OAuth, EU region available — required for LOPDGDD).
- **Trade-off:** Self-hostable Sentry exists if SaaS Sentry is rejected by the DPO. Skip Linear/Notion MCP for now — the team uses `docs/bugs/` as source of truth; adding a tracker doubles the surface.

### 3. Playwright MCP (`@microsoft/playwright-mcp`) — RECOMMENDED
- **What:** Drives a real browser via accessibility tree, not screenshots; deterministic.
- **Pains addressed:** 5 (flaky E2E). Lets `qa-engineer` reproduce flakes interactively before quarantining.
- **Install:** `claude mcp add playwright -- npx @playwright/mcp@latest`.
- **Trade-off:** Local execution, no third-party data leak. The agent can record a trace to `docs/qa-reports/` instead of skipping shards. Modest token cost per session.

### 4. PocketBase MCP — SKIP, use a thin custom server
- No mature, audited PocketBase MCP exists (community projects are stale/unmaintained as of Apr 2026). For pain 6 (schema drift), keep `npm run schemas:sync` as the gate and wrap it in a 60-line MCP server later if it becomes a hotspot. **Postgres MCP** (`@crystaldba/postgres-mcp` or `modelcontextprotocol/server-postgres` read-only) is worth bookmarking for the eventual Postgres migration — not now.

### 5. Filesystem / Git MCP — SKIP (duplicates built-ins)
Claude Code already has `Read/Write/Edit/Glob/Grep/Bash`. The official `filesystem` and `git` MCP servers add **zero capability** and consume a tool slot + permission prompts. Explicit rejection.

### 6. Vector / memory MCPs (Zep, Mem0) — SKIP, Engram wins
Engram is already wired, has the topic-key contract, and respects local data residency. Zep/Mem0 add a hosted vector DB that would require a DPA and re-uploading project context. No incremental value over Engram for this team size.

---

## Part B — Other AI tooling

### Multi-tool dev agents
- **Cursor / Cline / Aider:** Cursor for fast solo refactors when Claude Code session is too heavy; Aider when working over SSH on a constrained box. **Don't introduce Cline** — it overlaps Claude Code without a clear edge. Pick ONE secondary tool, not three.

### Autonomous PR agents (Devin / Sweep / Codex-Cloud)
- **Verdict: NO** for AMG. They require uploading the full repo to a third-party runtime; LOPDGDD Art. 28 sub-processor disclosure is a blocker, and the PocketBase test fixtures contain (synthetic but realistic) Spanish DNI patterns. The Builder-Validator chain in Claude Code already gives 80% of the value with zero data egress.

### LLM-as-judge for security review (pain 1)
- **Verdict: YES, gated.** Add an `ai-security-judge` step that runs AFTER grep-based `security-auditor` and posts a non-blocking advisory review. Use Claude Sonnet via the existing CI key, with a deterministic prompt that returns `{verdict, findings[]}` JSON. Grep stays the **blocking** gate (deterministic, auditable). The LLM is a **second opinion**, not a replacement — exactly the inversion of what failed today.

### Test generation (qa-engineer leverage)
- **CodiumAI Cover-Agent (OSS)** for unit-test backfill against `src/lib/` pure functions only. Skip for server actions and PocketBase queries — the Builder-Validator chain produces better tenant-isolation tests than any generator. Self-hosted, no data egress.

---

## If I had 1 day

Wire the **GitHub MCP** to `rafo-claude-bot`, then add a branch-protection rule that requires an approving review from a `security-auditor`-labeled bot account before merge. That alone closes pain 1, 3, and 4 — the 10-minute filter-injection window cannot recur because the merge button is physically blocked until the audit posts. Everything else (Sentry, Playwright MCP, LLM-judge) is week-2 polish.
