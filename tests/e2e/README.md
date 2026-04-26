# `tests/e2e/` — Layer 3: Browser E2E

Playwright browser tests. Renamed from `e2e/` in FEAT-042 PR 1 to align with the `tests/` engine-grouped layout.

## Layout

```
tests/e2e/
  pages/                ← Page Object Models (PageObject pattern)
  fixtures/             ← shared setup, auth, seeded data
  helpers/              ← shared utilities (auth, navigation)
  *.spec.ts             ← test specs, tagged @smoke / @regression / @a11y
  global-setup.ts       ← Playwright global setup
```

Categories live in **tags**, not subfolders:

- `@smoke` — must-pass on PR + post-deploy. ≤ 5 minutes total.
- `@regression` — full suite, PR + nightly.
- `@a11y` — axe-core assertions, PR.
- `@flaky` — quarantined with linked issue, nightly only.

## Run

```sh
npm run e2e                 # full suite (chromium project)
npm run e2e:ui              # interactive mode
npx playwright test --grep @smoke   # smoke only
```

CI gate selection uses `--grep @<tag>`, never folder paths.

See [docs/specs/FEAT-042-enterprise-qa-strategy.md](../../docs/specs/FEAT-042-enterprise-qa-strategy.md) §1 row 3.
