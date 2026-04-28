import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

// Strict lint config. The CI lint step runs with `--max-warnings=0`, so
// every rule below MUST be at error or warn level — `off` is acceptable
// only when the rule provably doesn't fit our stack.
//
// Adding a new rule: prefer `error` over `warn` to avoid quiet drift.
// If a rule has too much existing noise to fix in one PR, set `warn`,
// fix incrementally, then promote to `error`.
const eslintConfig = [
  // Ignore non-source files: generated, vendored, or running in a different
  // runtime (PB JS engine, service workers). Without this block, the IDE's
  // ESLint extension lints into `.next/types/` and reports issues in
  // Next.js-generated route validators (which we do not own).
  {
    ignores: [
      // Generated / build outputs
      '.next/**',
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',

      // PocketBase volumes / migrations / hooks — these run in PB's JS engine
      // (goja), not Node/Next. Different module system, different globals.
      // pb_migrations/* will be deleted in Week 5 of the rebuild plan.
      'pb_data/**',
      'pb_data.ci-disabled/**',
      'pb_hooks/**',
      'pb_migrations/**',
      'pb_migrations.local-disabled/**',
      // Local scratch space — `npm run pb:serve` writes pb_data + pb_migrations
      // here when developers run a local PB. Already in .gitignore; ESLint
      // flat config does not read .gitignore so we mirror it here.
      'tmp/**',

      // PWA service-worker bundles produced by next-pwa. Minified, vendored.
      'public/sw.js',
      'public/swe-worker-*.js',
      'public/workbox-*.js',

      // Legacy Node scripts using require(). Will be retired/replaced by
      // TypeScript scripts in Week 1+ of the rebuild (apply-schema.ts,
      // seed-tenant.ts, generate-slots.ts). Until then, lint not applied.
      'scripts/*.js',

      // Personal AI tooling lives off-repo per ADR-013. Local hooks /
      // settings under .claude/ are not project source; the source of truth
      // is ~/.claude/. ESLint should not lint anything under here.
      '.claude/**',
    ],
  },

  ...nextCoreWebVitals,
  ...nextTypescript,

  {
    rules: {
      // Forbid `{}` as a type — it allows any non-nullish value (0, "", etc.)
      // and is almost always a mistake. Use `object`, `Record<string, unknown>`,
      // or `unknown` instead.
      '@typescript-eslint/no-empty-object-type': 'error',

      // Forbid `any` — defeats the point of TypeScript. Use `unknown` and
      // narrow with type guards. If a third-party type is genuinely
      // unconstrained, prefer a specific assertion with a comment.
      '@typescript-eslint/no-explicit-any': 'error',

      // Unused vars are dead code. Allow `_`-prefixed args/destructures
      // for intentional ignores (function signatures we cannot change).
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],

      // Forbid non-null assertions (`foo!`). They silently mask null/undefined
      // bugs. Prefer narrowing or `assert(foo)` patterns.
      '@typescript-eslint/no-non-null-assertion': 'error',

      // Forbid `// @ts-ignore` — it disables type checking with no comment
      // explaining why. Use `// @ts-expect-error: <reason>` instead, which
      // self-removes when the underlying error is fixed.
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
          minimumDescriptionLength: 10,
        },
      ],

      // Loose `Function` type allows any signature. Use the actual function
      // shape (e.g. `(x: number) => string`) or `() => unknown`.
      '@typescript-eslint/no-unsafe-function-type': 'error',

      // Forbid `Object`, `Number`, `String`, `Boolean` as types — those are
      // the wrapper *constructors*, not primitives. Use `object`, `number`,
      // `string`, `boolean`.
      '@typescript-eslint/no-wrapper-object-types': 'error',

      // Catch unused ESLint disable comments — they rot otherwise.
      // (set at flat-config level via reportUnusedDisableDirectives below)

      // React 19 Compiler-aware strict rules introduced by eslint-config-next 16.
      // Disabled in this PR (deps bump only) to keep scope tight; existing code
      // has 10 violations that warrant their own refactor PR with proper review
      // of effect/state patterns. TODO(post-bump): triage and fix incrementally.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
    },
  },

  // ADR-014: pages and route handlers must NEVER touch PocketBase directly.
  // The only API layer is Server Actions in src/actions/** (which call
  // src/lib/pb.ts under the hood). This rule enforces that boundary at lint
  // time so the four known bypass pages (Week 2 of the rebuild) cannot
  // regrow elsewhere.
  //
  // What is forbidden:
  //   - importing from '@/lib/pb' anywhere under src/app/**
  //   - calling `.collection(...)` on any object under src/app/** (the
  //     PocketBase-specific access pattern, reachable via getPb() or via
  //     getStaffCtx().pb)
  //
  // The four known bypass call sites (settings, reports, quotes/[id],
  // quotes/new) carry an explicit eslint-disable + a Week-2 migration TODO.
  // Removing that disable comment is the migration acceptance signal.
  {
    files: ['src/app/**/*.{ts,tsx}'],
    ignores: [
      'src/app/**/__tests__/**',
      'src/app/**/*.{test,spec}.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/lib/pb', '@/lib/pb/*'],
              message:
                'ADR-014: pages and route handlers must not import PocketBase directly. Call a Server Action from src/actions/** instead.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='collection']",
          message:
            'ADR-014: pages must not call PocketBase .collection(...) directly. Use a Server Action from src/actions/**.',
        },
      ],
    },
  },

  // Test files — keep strict on real bugs (unused vars, empty types) but
  // relax patterns that are legitimate test ergonomics:
  //   - `foo!.bar` non-null assertions are common when asserting on mocked
  //     values whose null-shape is known. Forcing narrowing here adds noise.
  //   - `as any` in mocks of complex types is a pragmatic escape hatch
  //     (still discouraged; prefer `as unknown as T`).
  {
    files: [
      '**/__tests__/**/*.{ts,tsx}',
      '**/*.{test,spec}.{ts,tsx}',
      'tests/**/*.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Linter's own meta-config: report unused disable directives as warnings.
  // The `--max-warnings=0` CLI flag turns these into hard failures in CI.
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'warn',
    },
  },
];

export default eslintConfig;
