# Testing

Archivo has three layers of automated tests, run automatically at three
points: on every commit, on every push, and on every push/PR in GitHub
Actions (which is also the only path left to production — see
[Deploying](#deploying-render) below).

## The three layers

| Layer | Tool | Where | What it covers |
|---|---|---|---|
| **Unit** | Vitest | `tests/unit/` | Pure functions — no database, no filesystem, no network. Business logic like the workflow engine, archive health, permission checks, file naming. |
| **Integration** | Vitest | `tests/integration/` | Real Prisma calls against a real (test-only) Postgres database. Multi-tenant scoping, workflow transitions against real seeded data, file versioning. |
| **E2E** | Playwright Test | `tests/e2e/` | A real browser driving the real app end to end — login, creating an archive, uploading, workflow gating, search, reports, settings. |

Why three layers instead of one: unit tests are milliseconds and catch most
logic bugs immediately; integration tests catch the class of bug that only
shows up against a real database (a Prisma query that's subtly wrong, a
scoping rule that looks right in isolation); E2E tests catch the bugs that
only exist in the actual request pipeline — routing, session cookies,
Server Actions, RBAC enforcement at the boundary — which can't be exercised
by calling a function directly (see the note on Server Actions below).

### A note on what "integration" can't cover here

Server Actions (`"use server"` files, e.g. `src/app/actions/*.ts`) call
`cookies()` via Next's request-scoped store, which only exists inside a
real request — there's no clean way to invoke `login()` or
`transitionArchiveStatus()` directly from a Vitest test. Anything that goes
through a Server Action (auth, RBAC enforcement, workflow transitions) is
therefore covered by **E2E**, driving the real UI, rather than by
integration tests calling the action function directly. Integration tests
cover the plain library functions those actions call internally
(`src/lib/*.ts` files with no `next/headers` import) against a real
database.

## Running tests locally

### One-time setup

```
npm run test:db:start   # starts a dedicated local Postgres for tests (see below)
npx prisma db push --schema=prisma/schema.prisma   # with DOTENV_CONFIG_PATH=.env.test — see package.json's test:db:reset
npx playwright install chromium
```

The `test:db:reset` npm script does the schema-push + seed in one go:

```
npm run test:db:reset
```

### Day to day

```
npm run test:unit          # fast, no DB needed
npm run test:integration   # needs the test DB running (npm run test:db:start)
npm run test:e2e           # spins up a dev server on :3101 automatically
npm run test:e2e:smoke     # same suite, currently identical — see note below
npm run test:watch         # Vitest watch mode for unit+integration
```

`npm run test` runs unit + integration. `npm run test:ci` runs everything
CI runs (typecheck, lint, unit, integration, build, E2E) — the same
sequence as `.github/workflows/ci.yml`, useful for reproducing a CI failure
locally.

> Every test-related script that touches the database goes through
> `.env.test`, never `.env` — `.env.test`'s `DATABASE_URL` points at a
> dedicated test database. **Never point `.env.test` at the same database
> as `.env`** — integration tests and the E2E suite truncate and reseed
> the database they're given.

## The test database

Locally, tests run against a second, separate `prisma dev` instance (kept
apart from the "default" one `npm run dev:all` uses), created once and left
running:

```
npm run test:db:start   # creates/starts it — safe to re-run
npm run test:db:stop    # stops it when you're done for the day
```

`.env.test` hardcodes that instance's connection URL. If the instance is
ever removed and recreated, its assigned port can change — run
`npx prisma dev ls` and update the two URLs in `.env.test` to match.

**Known gotcha, inherited from local dev** (see `archivo/CLAUDE.md`'s note
on the embedded engine): `prisma dev`'s embedded Postgres can intermittently
drop connections under rapid connect/disconnect churn — running the full
integration + E2E suite back-to-back several times in a short window can
trigger this. `tests/setup/reset-test-db.ts` retries automatically, which
handles most cases. If a test run fails with `ECONNRESET` /
`Connection terminated unexpectedly` / `ECONNREFUSED` that has nothing to
do with your change, restart the instance:

```
npx prisma dev rm test --force
npm run test:db:start
npm run test:db:reset
```

This is a local-only characteristic of the embedded engine — **CI does not
have this problem**, because it runs against a real `postgres:16` container
(see the workflow file), not `prisma dev`.

Every integration test file and the E2E suite reset+reseed the database
before running (see `tests/setup/reset-test-db.ts`, which truncates every
table and reseeds via the real `prisma/seed.ts`) — tests never assume a
particular starting state beyond what that seed produces.

## Automatic runs

### Git hooks (Husky)

- **`pre-commit`** — `lint-staged` (ESLint `--fix` on staged files),
  `typecheck`, `test:unit`. Fast (seconds), no database needed, runs on
  every commit.
- **`pre-push`** — `build` only. This is what catches a broken production
  build before it leaves your machine — the exact class of issue behind
  several past Render deploy failures.

  `test:integration`/`test:e2e:smoke` were deliberately **removed** from
  `pre-push` (they originally ran here) — the local embedded test database
  proved unstable enough in practice to make pushing unreliable for a check
  that CI redundantly repeats seconds later against a real, stable Postgres
  container anyway. Local integration/E2E are still one command away
  (`npm run test:integration`, `npm run test:e2e`) whenever you want the
  faster feedback and the local test DB happens to be healthy — they're
  just not a hard gate on every push. **CI is the actual gate** before
  anything reaches production; see below.

If a hook fails, fix the issue and commit/push again — don't skip hooks
(`--no-verify`) to work around a real failure.

### GitHub Actions (`.github/workflows/ci.yml`)

Runs on every push (any branch) and every PR into `master`: install,
typecheck, lint, unit tests, then a real Postgres service container for
integration tests, then a production build, then the full E2E suite
headless. On a push to `master`, if every one of those steps passed, it
calls Render's deploy hook — see below.

## Deploying (Render)

Render's own "auto-deploy on every push" is turned off
(`render.yaml`'s `autoDeploy: false`). **GitHub Actions is now the only
path to production** — a push to `master` only reaches Render if the whole
CI job above passes.

**One-time setup required** (only whoever administers the Render/GitHub
accounts can do this):
1. In the Render dashboard, open the `archivo` web service → **Settings**
   → **Deploy Hook**, and copy the URL it gives you.
2. In the GitHub repo → **Settings** → **Secrets and variables** →
   **Actions**, add a new repository secret named `RENDER_DEPLOY_HOOK_URL`
   with that value.

Until that secret exists, the workflow's deploy step fails loudly
(`::error::RENDER_DEPLOY_HOOK_URL secret is not set…`) on a push to
`master` rather than silently doing nothing — so a missing secret is
obvious from the Actions tab, not a mystery weeks later.

## Conventions — keeping this suite alive

This is the actual mechanism behind "tests stay up to date": there's no
tooling that forces it, just a habit backed by hooks/CI that fail loudly
if it's skipped.

- **Adding a new pure function to `src/lib/`** (no `next/headers`, no
  Prisma) → add a unit test in `tests/unit/`.
- **Adding or changing a Prisma-backed `src/lib/` function** (no
  `next/headers`) → add/update an integration test in `tests/integration/`.
- **Adding or changing a Server Action or a whole user-facing flow** → add
  or extend a spec in `tests/e2e/`. Reuse `tests/e2e/fixtures/auth.ts` for
  login; follow the existing specs' pattern of unique, timestamped test
  data (`` `E2E Test Archive ${Date.now()}` ``) rather than relying on
  isolation between runs.
- **Found a real bug that slipped through** → write the test that would
  have caught it *before* fixing the bug, same as any other codebase.

## E2E selector notes (read before writing a new spec)

A few non-obvious things discovered writing the current suite, worth
knowing before guessing at a selector:
- The workflow stepper's clickable control is **`"Move to <state>"`**
  (e.g. `"Move to Pending Review"`) — the plain state label next to it
  (`"Pending Review"`) is a separate, non-interactive element.
- Folder names appear in *three* places on an archive's detail page (the
  sidebar tree, the folder grid card, and that card's "Options for …"
  button) — use `{ name: "…", exact: true }` to hit the sidebar tree
  button specifically, or a click on an ambiguous folder name will hit a
  Playwright strict-mode violation.
- "Export Excel" / "Export PDF" on a report run page are real navigational
  **links** (`role="link"`), not buttons — they're plain GETs to an export
  route with a `Content-Disposition: attachment` response.
- The Appearance settings page's editable custom-color field is a visible
  `textbox` with accessible name `"Custom <current hex>"` — there's also a
  same-value `input[type="hidden"]` mirror used for form submission, which
  is correctly not interactable; don't target it.
- An **uncategorized** archive (no category chosen at creation) has zero
  folders and nowhere to upload into — give a test archive a category if
  the test needs to upload a file.
