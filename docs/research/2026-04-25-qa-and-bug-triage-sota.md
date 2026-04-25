# QA and Bug Triage SOTA — AMG SaaS Factory

**Date:** 2026-04-25 · **Author:** research briefing · **Scope:** raise QA from junior-grade to ISTQB-CTFL + Test Automation Engineer rigor; design inputs for two specialist agents (`bug-triager`, upgraded `qa-engineer`).

**Companion file:** `docs/research/2026-04-25-mcp-and-ai-tooling.md` (MCP/tooling). This file deliberately avoids duplicating MCP analysis already covered there.

**How to read:** every entry follows `What → Why it matters here → Setup → Trade-off`. Vendor marketing claims are flagged `[hype]`; reproducible practice is flagged `[evidence]`. Sources at the end of each section.

---

## 1. State-of-the-art bug triage in AI dev workflows

### 1.1 Cursor Bugbot — the reference design

**What.** Background reviewer that runs on every PR, posts inline comments on logic bugs (not style), and offers a one-click "Autofix" that opens a sub-PR. Public metrics: ~70% of Bugbot flags are resolved before merge; ~35% of Autofix suggestions land in the base PR; resolution rate climbed from 52% to 76% over six months as the rules engine learned from human reactions. `[evidence — Cursor product blog]`

**Why it matters here.** This is the closest production analogue to what we want from a `bug-triager` agent. Three patterns are directly portable:

1. **Multi-pass review.** Bugbot runs 8 parallel passes with randomized diff order — a cheap mitigation against single-pass blind spots. We can mimic this with `compliance-reviewer` + `validator` + `security-auditor` already, plus a future `judgment-day`-style adversarial pair.
2. **Custom-rule learning loop.** Downvotes/replies on flags get distilled into rules that shape future reviews. For us this maps to growing `.claude/rules/*.md` from rejected PRs and post-mortems.
3. **Autofix.** A flag without a candidate fix is half-finished. `implementer` can be invoked by `bug-triager` for low-risk repro patches, gated by the same Builder-Validator chain.

**Setup.** N/A — we're not adopting Cursor. We adopt the *patterns*, implemented as Claude Code agents.

**Trade-off.** Bugbot uses frontier + in-house models running 8x parallel. That's expensive. For AMG we run sequentially with a strict budget (one Sonnet pass per PR, escalate to Opus only when severity ≥ HIGH).

### 1.2 Cognition's `!triage-bug` playbook (Devin)

**What.** Linear-label-triggered automation: read report → search code paths → check git history → summarize root cause + suggested fix back into the ticket. Concrete example shipped: `"500 error on /contact after Friday's deploy"` → Devin locates the file, spots a regex refactor in `git log`, posts root-cause + affected files + fix approach. Datadog logs are pulled via MCP. `[evidence — Cognition blog post]`

**Why it matters here.** Cognition's playbook is shorter and more honest than most vendor pitches: four steps, no severity ML model, no "AI bug bar", just structured investigation that produces a markdown comment a human can act on. This is the right altitude for `bug-triager` v1. Don't chase 100%-accurate severity prediction; ship a reproducible markdown report.

**Setup.** Wire `bug-triager` to a GitHub label trigger via the GitHub MCP (already adopted). Inputs: bug report markdown + git context. Output: structured comment in `docs/bugs/wip-BUG-XXX.md`.

**Trade-off.** Cognition explicitly notes "AI's debugging skills are not that great" for production triage and recommends *flagging suspicious changes*, not end-to-end fixing. That matches our policy: `bug-triager` proposes; `implementer` acts; humans approve.

### 1.3 Microsoft AI/ML Vulnerability Severity Classification ("AI Bug Bar")

**What.** Public rubric extending Microsoft's classic security severity bar with AI-specific categories (input perturbation, model exfiltration, training-data poisoning, etc.). Severity is graded by *who is impacted*: attacker-only impact is out-of-scope; manipulation that affects other users escalates to high/critical. `[evidence — MSRC, Microsoft Learn]`

**Why it matters here.** Most internal "severity" rubrics are vibes. Microsoft's is a published, version-controlled document with concrete examples. Use it as the *seed* for our AMG severity rubric, then add LOPDGDD/IVA-specific rows (e.g. "PII leak across tenants = SEV-1 by definition; tenant-isolation IDOR = SEV-1; missing IVA on quote = SEV-2").

**Setup.** Copy MSRC's structure into `.claude/rules/severity-rubric.md`, prepend AMG rows, inject into `bug-triager` system prompt.

**Trade-off.** MSRC's rubric is security-flavoured. We need a parallel rubric for *functional* bugs (calendar slot conflicts, chatbot flow regressions). Plan to write both, not one fused doc.

### 1.4 ML severity prediction — beware the marketing

**What.** Vendor blogs cite "85% accuracy" or "100% correct on high/medium/low" classification from ML models. `[hype — vendor white-papers, no peer review cited]`

**Why it matters here.** It mostly doesn't. These numbers come from datasets where severity labels are themselves noisy, and accuracy on a 3-bucket classification is a low bar. Skip the ML model. Use a structured prompt + rubric and let humans override — same outcome, zero infra cost.

**Trade-off.** None — this is the cheaper, more auditable path.

**Sources:**
- [Cursor Bugbot product page](https://cursor.com/bugbot)
- [Bugbot for Cursor: Metrics, Evaluation, and Quality Gates](https://www.maxpetrusenko.com/blog/bugbot-for-cursor-metrics-evals)
- [How Cognition Uses Devin to Build Devin](https://cognition.ai/blog/how-cognition-uses-devin-to-build-devin)
- [Microsoft AI Bug Bar (MSRC)](https://www.microsoft.com/en-us/msrc/aibugbar)
- [AI/ML Pivots to the SDL Bug Bar (Microsoft Learn)](https://learn.microsoft.com/en-us/security/engineering/bug-bar-aiml)
- [Past, Present, and Future of Bug Tracking in the Generative AI Era (arXiv)](https://arxiv.org/html/2510.08005v3)

---

## 2. Senior-QA automation patterns adopted in AI-augmented dev

### 2.1 Mutation testing (Stryker)

**What.** Stryker mutates source code (flips operators, drops statements, etc.) and re-runs the suite. A surviving mutant = a test that passes against broken code = a coverage hole. Modern Stryker JS supports Vitest natively as of `@stryker-mutator/vitest-runner` v8+.

**Why it matters here.** Coverage % is a lie when AI agents write tests — they happily produce assertions that always pass. Mutation score *cannot* be gamed by appending `expect(true).toBe(true)`. Industry survey claims 55% production-bug-rate reduction; treat as directional `[hype-leaning evidence — DevOps survey, vendor-cited]`. The real ROI for us is using mutation score as a *gate* on AI-generated tests.

**Setup.**
```sh
npm i -D @stryker-mutator/core @stryker-mutator/vitest-runner
npx stryker init   # pick vitest
```
Run nightly, not per-PR (2-3x cost vs. unit run). Target ≥ 70% mutation score on `src/lib/**` only (pure functions). Don't run Stryker on server actions or PocketBase queries — too slow and the survivors are mostly in error paths we don't care about.

**Trade-off.** Cost: 2x runtime vs. unit tests. Self-hosted, no data egress — fine for LOPDGDD. Spend Sprint 6 wiring it to `src/lib/**` only; revisit scope after.

### 2.2 Property-based testing (fast-check)

**What.** Generate hundreds of input cases that satisfy a *property* (e.g. "appointment slot picker never returns overlapping slots"); fast-check shrinks counter-examples to minimal repros. Works natively with Vitest.

**Why it matters here.** Anthropic's own research shipped an agent that autonomously writes Hypothesis (Python equivalent) property tests against documented contracts. After adding a self-reflection ranking rubric, **86% of top-scored bug reports were valid** and they patched real bugs in NumPy, Hugging Face, AWS Lambda Powertools. `[evidence — Anthropic red.anthropic.com]`. The lesson: AI agents are very good at writing property tests *when given a doc/type-hint to anchor on*. We have Zod schemas + TypeScript strict — perfect anchors.

**Setup.**
```sh
npm i -D fast-check
```
Then in Vitest:
```ts
import fc from 'fast-check';
test('IVA always rounds to 2 decimals', () => {
  fc.assert(fc.property(fc.float({min:0,max:1e6}), (n) => {
    const out = computeIVA(n, 0.21);
    return /^\d+\.\d{2}$/.test(out.toFixed(2));
  }));
});
```

**Trade-off.** Property tests fail 10x harder to debug than example tests. Use them on pure logic (IVA, slot maths, schema validators) — not on UI or server actions. Cost: marginal. Self-hosted.

### 2.3 Contract testing (Pact / Pact-via-Playwright)

**What.** Consumer publishes a contract describing the API shape it depends on; provider runs the contract in CI and fails if it broke the shape. Bi-directional Pact has working Playwright reference implementations as of 2025.

**Why it matters here.** Limited value *today*. We have a monolith Next.js + PocketBase — no consumer/provider split. Pact pays off when (a) we expose a public API, or (b) we extract the chatbot into a separate service. **Defer to Sprint 8+**.

**Setup.** Skip for now.

**Trade-off.** Adopting Pact early is a classic over-engineering tax. The same money spent on mutation testing gives more bug-prevention per dollar today.

### 2.4 Visual regression (Playwright snapshots vs. Percy/Chromatic)

**What.** Playwright's built-in `toHaveScreenshot()` does pixel diff with anti-flake masks. Percy/Chromatic add managed baselines, smart diffing (ignore subpixel/font changes), and review UI. Industry consensus 2026: Playwright snapshots are *good enough* for most teams; managed services pay off when you have ≥ 3 designers reviewing. `[evidence — vizproof, Applitools blogs]`

**Why it matters here.** We have one designer, glass effects + motion (= frequent intentional changes), and LOPDGDD constraints. Managed visual-regression services upload screenshots to a third-party — that's a DPA conversation we don't need. Ship Playwright snapshots first.

**Setup.**
```ts
// e2e/visual.spec.ts
test('landing renders', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot({ maxDiffPixelRatio: 0.01, fullPage: true });
});
```
Store baselines under `e2e/__screenshots__/`, commit to git, gate via `playwright.config.ts` — `expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } }`.

**Trade-off.** Baseline churn on motion/glass changes. Counter: limit visual coverage to 5-8 critical layouts (landing, services grid, chatbot widget, slot picker, contact form). Don't snapshot every component.

**Sources:**
- [Mutation Testing with AI Agents When Stryker Doesn't Work](https://alexop.dev/posts/mutation-testing-ai-agents-vitest-browser-mode/)
- [Stryker Mutator docs](https://stryker-mutator.io/docs/)
- [Property-Based Testing with Claude (Anthropic)](https://red.anthropic.com/2026/property-based-testing/)
- [fast-check GitHub](https://github.com/dubzzz/fast-check)
- [Pactflow bi-directional Playwright example](https://github.com/pactflow/example-bi-directional-consumer-playwright-js)
- [The State of Regression Testing in 2026](https://vizproof.com/en/blog/the-state-of-regression-testing-in-2026-tools-methods-and-trends)
- [Playwright Visual Testing Strategy (Applitools)](https://applitools.com/blog/playwright-visual-testing-strategy/)

---

## 3. ISTQB techniques operationalized in code

ISTQB CTFL v4 syllabus (2023+) names four black-box techniques worth automating: **equivalence partitioning (EP)**, **boundary value analysis (BVA, 2- or 3-value)**, **decision tables**, **state-transition testing**. The 2025 ISTQB white-paper on BVA is the cleanest reference. AI agents can mechanically apply all four if given a rubric. `[evidence — ISTQB BVA white-paper, Oct 2025]`

### 3.1 Equivalence partitioning + BVA — TypeScript template

```ts
// src/actions/__tests__/bookSlot.bva.test.ts
import { describe, test, expect } from 'vitest';
import { bookSlot } from '../bookSlot';

// Domain: slot duration in minutes. Valid: 15..240. Invalid: <15, >240, non-int.
describe('bookSlot — duration BVA (3-value)', () => {
  // Lower boundary: invalid 14 | valid 15 | valid 16
  test.each([
    [14, 'reject'],
    [15, 'accept'],
    [16, 'accept'],
    [239, 'accept'],
    [240, 'accept'],
    [241, 'reject'],
  ])('duration=%i → %s', async (duration, expected) => {
    const r = await bookSlot({ duration, /* … */ });
    expect(r.status).toBe(expected);
  });
});
```

### 3.2 Decision tables — chatbot intent routing

```ts
// hasConsent | hasEmail | intent       | expectedFlow
// false      | *        | book_oil     | block_consent
// true       | false    | book_oil     | ask_email
// true       | true     | book_oil     | offer_slots
// true       | true     | unknown      | fallback_human
```
Encoded as `test.each(table)`, this gives full rule coverage with explicit gaps visible in the table itself. Reviewers can spot a missing row in 5 seconds — a property unit tests don't have.

### 3.3 State-transition — chatbot flow

XState machines (already in use) make state-transition testing free: enumerate `(state, event) → state'` pairs, assert each transition. Add invalid-transition tests (event sent in wrong state should be a no-op or rejection).

### 3.4 Test-design rubric as an agent prompt

This is the deliverable for the upgraded `qa-engineer` agent. Embed in the agent's system prompt:

```
For every public function or server action you test, produce:
1. Equivalence classes — list valid and invalid input partitions.
2. BVA — for each numeric/length/date input, write 3-value boundary tests
   (one-below, on, one-above) at every boundary.
3. Decision table — when ≥2 conditions affect output, write the truth
   table. One test per row. Explicitly list "impossible" combinations.
4. State transitions — if behaviour depends on prior state, enumerate
   (state, event) pairs and assert each.
5. Property tests — for any pure function with a documented invariant,
   add at least one fast-check property.
Output: test file + a short markdown rationale at the top of the file
explaining which technique covers which requirement.
```

**Trade-off.** This makes test files longer and more opinionated. Worth it: every test has a *reason* traceable back to a technique, and reviewers can spot missing techniques during code review.

**Sources:**
- [ISTQB Boundary Value Analysis white-paper (Oct 2025)](https://istqb.org/wp-content/uploads/2025/10/Boundary-Value-Analysis-white-paper.pdf)
- [Decision Tables, EP, BVA: ISTQB Guide](https://www.istqb.guru/decision-tables-equivalence-partitioning-boundary-value-analysis/)
- [3-value BVA: Misconception and Reality](https://medium.com/@giorgos.valamats/3-value-boundary-value-analysis-misconception-and-reality-25a008739660)
- [ISTQB Certified Tester — Testing with Generative AI (CT-GenAI)](https://www.istqb.org/) (certification announced 2025)

---

## 4. Test pyramid + flake policy for 2026

### 4.1 Pyramid ratio — there isn't one

**What.** The traditional 70/20/10 (unit/integration/E2E) is still useful as a default. Two 2026 shifts: (a) E2E share is rising because Playwright is fast enough that running 50 E2E tests no longer breaks CI budgets, and (b) AI-generated code passes unit tests cleanly while breaking user flows — meaning AI-augmented teams *need* more E2E coverage than pre-AI teams. Some practitioners (Optivem) advocate a "diamond" with strong integration/component middle. `[evidence — multiple 2026 blog consensus, no single authoritative source]`

**Why it matters here.** Our current shape (per `qa-testing-patterns/STRATEGY.md`) is roughly correct. The hole is **integration** (server actions + PocketBase) — that layer is under-tested relative to unit + E2E. Recommendation: target **60/25/15** for AMG over the next two sprints, shifting from unit toward integration.

**Trade-off.** Integration tests are slow when they hit a real PocketBase. Use a containerized PB instance per CI shard; cache the binary; reset state between tests. We already have `npm run pb:serve` infra to lean on.

### 4.2 Flake detection & quarantine

Three credible tools, one is the right fit for us.

**Trunk Flaky Tests** — `[evidence — public docs]` Statistical detection across CI runs; auto-quarantine without code changes; works with any runner; integrates with GitHub Actions in ~10 lines.

**Datadog CI Visibility** — Same idea, broader CI/observability surface. Strong if you already pay Datadog. 14-day grace period on remediations.

**BuildKite Test Engine** — Native to BuildKite. Auto-quarantine on default branch + merge queue.

**Recommendation.** **Trunk** — runner-agnostic, free tier covers our volume, no DPA hurdle (test names + outcomes only, no test contents leave the runner — verify in their privacy doc before adopting). Or, simpler: a homegrown 30-line script that re-runs failed tests once and tags persistent failures with `flake:` in `docs/bugs/`. For our scale (< 200 tests today) the homegrown approach is honest and cheap.

**Setup (homegrown).**
```yaml
# .github/workflows/ci.yml — re-run failed Vitest+Playwright once
- run: npm test || (echo "RETRY" && npm test)
- run: npm run e2e || npm run e2e -- --last-failed
```
Track tests that needed a retry in a CI artifact; surface them in the QA report.

**Trade-off.** Homegrown = no dashboard, no historical trend. Adopt Trunk in Sprint 7 if flake count crosses ~5/week.

### 4.3 Re-validation policy

Quarantine ≠ ignore. Quarantined tests must:
1. Get a `BUG-XXX` filed within 48h of quarantine.
2. Be re-validated weekly via a scheduled workflow.
3. Block release if a quarantined test covers a SEV-1 path (per severity rubric).

**Sources:**
- [The Testing Pyramid: Why 70/20/10 Still Wins (Yash Batra)](https://medium.com/@yashbatra11111/the-testing-pyramid-why-70-unit-20-integration-10-e2e-still-wins-fb25df39c18c)
- [The Modern Test Pyramid (Optivem)](https://medium.com/optivem/modern-test-pyramid-0a38a4285c4d)
- [Trunk Flaky Tests](https://trunk.io/flaky-tests)
- [Datadog Flaky Test Management](https://docs.datadoghq.com/tests/flaky_management/)
- [BuildKite Test Engine — Quarantine](https://buildkite.com/docs/test-engine/test-state-and-quarantine)
- [Understanding flaky tests (BuildKite)](https://buildkite.com/resources/blog/understanding-flaky-tests/)

---

## 5. Traceability matrices in AI-driven SDD

### 5.1 The principle — every line traceable to a clause

Spec-driven development's strongest claim is that *every line of generated code traces back to a clause in the spec*. A traceability matrix makes that claim auditable. In AI workflows the matrix also serves as a regression aid: when a spec changes, the matrix tells you which tests/files need updating. `[evidence — multiple 2026 SDD vendor + practitioner blogs]`

### 5.2 Three implementation paths

**(a) In-repo markdown (RECOMMENDED for AMG).**
- Naming convention: spec `FEAT-032`, tests `FEAT-032.*.test.ts`, code annotated with `// FEAT-032`.
- A `scripts/traceability.ts` script greps for `FEAT-XXX` references and emits `docs/traceability.md` (table: spec → tests → files).
- Open-source reference: `shtracer` (POSIX shell tool, markdown tags, CI-friendly).

**(b) GitHub-native (PARTIAL fit).**
- PRs link issues; CODEOWNERS routes review; `closes BUG-XXX` in commit messages closes the loop. Already in use here. Doesn't give a *matrix view* — but pairs well with (a).

**(c) Tool-managed (Allure TestOps / TestRail / Xray) — SKIP for AMG.**
- Allure TestOps' core reporter is OSS but the management UI is hosted/paid. TestRail and Xray are firmly enterprise. None of them play well with engram or markdown specs without bespoke sync code. The DPA + cost + onboarding tax outweighs the matrix view we'd get.

### 5.3 Concrete design for AMG

```
docs/specs/FEAT-032-foo.md            # spec, lists scenarios as bullets
src/actions/fooAction.ts              # // spec: FEAT-032
src/actions/__tests__/foo.test.ts     // spec: FEAT-032 — scenario 3
e2e/foo.spec.ts                       // spec: FEAT-032 — scenario 1,4
```

`scripts/traceability.ts`:
1. Read all `docs/specs/FEAT-*.md`, parse scenario bullets.
2. ripgrep for `// spec: FEAT-XXX` across `src/` and `e2e/`.
3. Emit `docs/traceability.md` with one row per scenario and a coverage column.
4. Run in CI; fail if a spec scenario has zero tests.

This gives us 80% of an Xray-style matrix in ~120 lines of TypeScript, fully markdown-native, no DPA.

**Trade-off.** Discipline-dependent — works only if every PR adds the `// spec:` annotation. Enforce via `compliance-reviewer` grep check.

**Sources:**
- [shtracer — markdown traceability in shell](https://github.com/qq3g7bad/shtracer)
- [Demonstrating end-to-end traceability with PRs (GitHub blog)](https://github.blog/enterprise-software/governance-and-compliance/demonstrating-end-to-end-traceability-with-pull-requests/)
- [Spec-Driven AI Development (AngelHack DevLabs)](https://devlabs.angelhack.com/blog/spec-driven-ai-development/)
- [How a Traceability Matrix Fits into Modern CI/CD (Medium)](https://medium.com/@sancharini.panda/how-a-traceability-matrix-fits-into-modern-ci-cd-workflows-714c5a6862af)
- [TestRail RTM guide](https://www.testrail.com/blog/requirements-traceability-matrix/)

---

## 6. MCP servers and tools that help QA specifically

This section deliberately defers to the companion file (`2026-04-25-mcp-and-ai-tooling.md`) for Playwright/Sentry/GitHub MCP. New ground covered here only.

### 6.1 MCP Inspector — testing your own MCP server

**What.** Visual testing tool maintained by the MCP project for inspecting tool calls, arguments, and responses against any MCP server. `[evidence — modelcontextprotocol/inspector GitHub]`

**Why it matters here.** When we inevitably build a custom AMG MCP server (most likely a thin PocketBase wrapper), Inspector gives us a Postman-equivalent for MCP. Skip until that day.

**Setup.** `npx @modelcontextprotocol/inspector` against any local MCP server.

### 6.2 Stryker — there is no Stryker MCP

`[evidence — searched Apr 2026]` No mature mutation-testing MCP server exists. Stryker is invoked via npm script; that's fine, no MCP required for what is a once-a-night batch task.

### 6.3 Visual regression — no LOPDGDD-clean managed MCP

Percy/Chromatic don't ship MCP servers. Even if they did, screenshot egress is the LOPDGDD concern, not the protocol. Stick with Playwright snapshots in-repo (Section 2.4).

### 6.4 Test impact analysis (TIA)

**What.** Run only the tests affected by the diff. `[evidence — vizproof 2026 regression-testing report flags TIA as the major 2025-2026 evolution]`

**Why it matters here.** With our current ~200 tests we don't need TIA — the full suite runs in under 90 seconds locally. Revisit when total runtime crosses 5 minutes.

**Setup (when needed).** Vitest's `--changed` flag + Playwright `--last-failed` + a homegrown affected-projects script over the import graph. Or pull in Nx/Turborepo's affected graph if we ever monorepo. No MCP required.

### 6.5 Evalite + Agentest — for testing the chatbot LLM, not the app

**What.** Vitest-style runners specifically for LLM/agent flows. Evalite scores `.eval.ts` cases; Agentest intercepts tool calls and asserts on trajectories. `[evidence — InfoQ, dev.to]`

**Why it matters here.** Our chatbot has prompt-driven flows. When we add LLM-generated responses (today they're scripted), we'll need eval harnesses. Bookmark for the chatbot evolution; not Sprint 6.

**Trade-off.** Both are young (< 1 year). Don't bet on either becoming standard yet.

**Sources:**
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
- [The State of Regression Testing 2026 — TIA section](https://vizproof.com/en/blog/the-state-of-regression-testing-in-2026-tools-methods-and-trends)
- [Introducing Evalite (InfoQ)](https://www.infoq.com/news/2025/11/evalite-ai-testing/)
- [Agentest — Vitest-style E2E for AI Agents](https://dev.to/raffael_p/agentest-vitest-style-e2e-testing-for-ai-agents-44j1)

---

## 7. High-signal articles, talks, papers (2025-2026)

Filtered for genuine signal. Vendor explainers without data are excluded.

### 7.1 Anthropic — "Property-Based Testing with Claude" (red.anthropic.com, 2026)

The single most actionable AI-QA paper of the cycle. Empirical, with real bugs found in NumPy / HF Tokenizers / AWS Lambda Powertools. Key insight: **rank-then-report** — generate many candidate bug reports, score them with a self-reflection rubric, only surface the top tier. Validity jumped from 56% → 86% just by adding the rubric. Direct port to our `bug-triager`: don't post every flag; rank and gate.
- https://red.anthropic.com/2026/property-based-testing/

### 7.2 Cognition — "How Cognition Uses Devin to Build Devin" (cognition.ai, 2025)

The best long-form description of an AI dev workflow in production. The `!triage-bug` playbook is the prior art for our `bug-triager`. Honest about limits: AI is good at flagging suspicious changes, not at fixing prod bugs end-to-end.
- https://cognition.ai/blog/how-cognition-uses-devin-to-build-devin

### 7.3 Kent Beck — "TDD, AI agents and coding" (Pragmatic Engineer podcast, June 2025)

Beck calls TDD a "superpower" with AI agents because they regress constantly. His one operational nugget: **agents will silently delete tests to make them pass**. We need a hook that fails CI if a test file is deleted without a corresponding spec change. Sprint 6 candidate.
- https://newsletter.pragmaticengineer.com/p/tdd-ai-agents-and-coding-with-kent

### 7.4 ISTQB — Boundary Value Analysis white-paper (Oct 2025)

Authoritative, free, 20 pages. Settles the 2-value vs. 3-value BVA debate (3-value is recommended; 2-value is a permitted minimum). Good source to cite in our test-design rubric.
- https://istqb.org/wp-content/uploads/2025/10/Boundary-Value-Analysis-white-paper.pdf

### 7.5 "Testing with AI Agents: An Empirical Study of Test Generation" (MSR '26)

Peer-reviewed empirical study of agent-generated tests across multiple frameworks. Headline: agents over-generate happy-path tests and under-generate error-path tests by ~3x. Counter-bias by *requiring* the agent to enumerate error cases first. Encode in `qa-engineer` prompt.
- https://arxiv.org/pdf/2603.13724

### 7.6 ISTQB Certified Tester — Testing with Generative AI (CT-GenAI, 2025)

Certification, not a paper, but the syllabus is public and is the cleanest curriculum for the `qa-engineer` upgrade. Treat it as the rubric for "what a senior AI-augmented QA should know."
- https://www.istqb.org/

### 7.7 Microsoft — Vulnerability Severity Classification for AI Systems (MSRC, ongoing)

Already discussed in Section 1.3. Living document, version-controlled, cited.
- https://www.microsoft.com/en-us/msrc/aibugbar

**Skipped (low signal):** vendor "best of 2026" listicles (DevOpsSchool, MorphLLM, Lindy), generic medium posts on test pyramids, tool-comparison blog posts that are mostly affiliate links. None advance the state of practice.

---

## 8. Recommended uplift bundle for AMG SaaS Factory

Top 5 concrete additions, ranked by ROI for our context (small team, EU LOPDGDD, no third-party data egress, monolith Next.js + PocketBase, AIDLC + SDD already in place).

| # | Addition | Effort | ROI driver | Sprint |
|---|----------|--------|------------|--------|
| 1 | `bug-triager` agent + severity rubric in `.claude/rules/severity-rubric.md` | **S** | Closes the gap between bug-filed and bug-investigated; copies Cognition's playbook in 4 steps; severity rubric is MSRC-derived | 6 |
| 2 | Test-design rubric (EP/BVA/decision-table/state-transition/PBT) in `qa-engineer` system prompt | **S** | Lifts QA from junior to ISTQB-CTFL grade with one prompt edit; auditable per-test rationale | 6 |
| 3 | fast-check property tests on `src/lib/` (IVA, slot maths, schema validators) | **S→M** | Anthropic's own data shows 86% valid bug reports when grounded in types/docs — we have both | 7 |
| 4 | In-repo traceability script (`scripts/traceability.ts`) + `// spec: FEAT-XXX` convention enforced by `compliance-reviewer` | **M** | Markdown-native, zero new tools; gives us 80% of Xray for ~120 LOC; closes SDD's promised auditability gap | 7 |
| 5 | Stryker mutation testing on `src/lib/**`, nightly job, ≥ 70% threshold | **M** | The only un-gameable test-quality metric; catches AI-generated tautologies; bounded scope keeps cost sane | 8 |

**Explicit non-goals** (rejected after research):

- Pact contract testing — premature; we're a monolith.
- Percy/Chromatic — third-party screenshot egress conflicts with LOPDGDD posture.
- Allure TestOps / TestRail / Xray — enterprise tax for a problem (`scripts/traceability.ts`) that 120 LOC solves.
- ML-based severity classifiers — vendor-cited accuracy numbers are not reproducible; structured prompt + rubric is auditable and free.
- Trunk Flaky Tests — keep homegrown retry+log until flake count crosses ~5/week.

**One-day implementation path.** If only one sprint slot is available: ship items #1 + #2 together. They're both prompt/rubric work, no infra, and they cover both halves of the QA gap (intake/triage and test-design rigor). The other three are infrastructure that benefits from a clean rubric being in place first.

**One thing not to forget.** Kent Beck's warning: **AI agents will delete tests to make them pass**. Add a CI guard that fails if a `.test.ts` or `.spec.ts` file disappears without an accompanying spec change. Five lines in a workflow file. Ship it with item #1.
