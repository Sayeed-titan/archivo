@AGENTS.md

# Archivo (formerly "DEAMS" codename)

Configurable, multi-tenant Event/Archive Management platform. Originally
scoped for one NGO's event archive, now built as a sellable multi-industry
product — NGO is just the first configured vertical.

Full background, product decisions, and phased build prompts live in the
sibling `ngo-archive/` folder at the repo root:
- `ngo-archive/HANDOFF.md` — decision log (read this first)
- `ngo-archive/SRS.md` — full requirements spec
- `ngo-archive/PRODUCT_ROADMAP.md` — phasing, business case
- `ngo-archive/CLAUDE_CODE_PROMPTS.md` — the ordered build prompts this
  project is being built from (**all 7 prompts complete** as of this
  session — see the Prompt 7 section below for what's next if resuming)

## Key decisions locked in
- **Multi-tenant from day one**: single deployment, every domain table
  scoped by `organizationId` (see `prisma/schema.prisma`).
- **Schema-flexible by design**: `Category`, `FolderTemplate`,
  `CustomFieldDefinition`, and `LookupList` are org-configurable tables,
  not fixed columns/enums — this is the whole point of the multi-industry
  bet, don't reintroduce hardcoded NGO-only concepts.
- **Prisma 7 + driver adapters**: this Prisma version does NOT support
  `datasource { url = env(...) }` in the schema file. Migration/CLI config
  reads the URL from `prisma.config.ts` (`datasource.url`); the runtime
  `PrismaClient` takes a `PrismaPg` adapter instance (see `src/lib/prisma.ts`).
  Don't "fix" this back to the old pattern — it will fail schema validation.
- **Next.js 16 renamed `middleware.ts` to `proxy.ts`** — route-protection
  logic lives in `proxy.ts` at the repo root, not `middleware.ts`.
- Local dev DB: `npx prisma dev` runs an embedded WASM Postgres (no Docker
  needed). Its shadow-database path is flaky for `prisma migrate dev`/
  `migrate resolve` in this environment — use `prisma db push` for local
  iteration; the versioned migration in `prisma/migrations/` was generated
  via `prisma migrate diff` and is what real Postgres deployments should use.
  **It also intermittently drops live connections under concurrent load**
  ("Server has closed the connection" / `ConnectionClosed`) — this is a
  characteristic of the embedded engine itself, not app-level pool
  exhaustion. `withConnectionRetry()` in `src/lib/prisma.ts` wraps the
  hottest call sites (`getCurrentUser`/`getShellUser`/login, the
  dashboard's concurrent `Promise.all` queries) with a backoff retry —
  wrap any new high-fan-out query the same way rather than re-debugging
  this. Separately: **never hard-kill (`taskkill /F`) the `next dev`
  process in a tight loop** — repeated ungraceful kills within seconds of
  each other can wedge the separate, long-running `prisma dev` engine
  process itself (not just the app's pool), requiring a manual restart of
  `prisma dev` and clearing a stale lock at
  `%LOCALAPPDATA%\prisma-dev-nodejs\Data\durable-streams\default\`. One
  clean restart per change, with normal wait times, is fine — a rapid
  restart loop during testing is what causes this, confirmed by
  reproducing and fixing it in this session.

## Demo login (after `npm run db:seed`)
- `admin@demo-ngo.org` / `Password123!` (Administrator)
- `officer@demo-ngo.org` / `Password123!` (Archive Officer)
- `deptuser@demo-ngo.org` / `Password123!` (Department User)
- `viewer@demo-ngo.org` / `Password123!` (Viewer)

## File versioning & external editor connectors (Prompt 4)
- Re-uploading a file with the same name into the same folder creates a
  new `File` row linked via `previousVersionId` and flips the old row's
  `isLatest` to false — nothing is overwritten in place. See
  `src/lib/file-storage.ts` (`saveUploadedFile`) and the version-history
  expander in `src/app/archives/[id]/file-row.tsx`.
- "Open in <provider>" is a pluggable connector: `src/lib/connectors/types.ts`
  defines the interface, `google.ts` implements it, `microsoft.ts` is a
  documented stub. `Organization.docEditorProvider` picks which one is
  active; `OrgIntegration` stores the org's OAuth tokens per provider.

### Google Cloud Console setup (to actually test the Connect flow)
1. Create/select a project at console.cloud.google.com, enable the
   **Google Drive API**.
2. Configure the OAuth consent screen (External or Internal, per your
   Workspace setup) — no special verification needed for internal testing
   with your own account added as a test user.
3. Create an **OAuth 2.0 Client ID** of type "Web application".
4. Add `http://localhost:3000/api/integrations/google/callback` (or your
   deployed URL's equivalent) under **Authorized redirect URIs**.
5. Copy the Client ID/Secret into `.env` as `GOOGLE_CLIENT_ID` /
   `GOOGLE_CLIENT_SECRET`; `GOOGLE_REDIRECT_URI` must exactly match what
   you added in step 4.
6. As an Administrator in the app, go to Settings → Integrations → Connect
   Google Workspace. The requested scope is `drive.file` (only files this
   app creates/opens — not the user's whole Drive).

## Search & dynamic report builder (Prompt 5)
- `/search` covers SRS 3.7: free-text across name/venue/organizer/donor/
  project/keywords/filename plus advanced filters (category, status,
  project, month/year, doc type) — see `src/lib/search-archives.ts`.
- Reports are **not** 7 hardcoded pages. `ReportTemplate` (org-scoped)
  stores a `fields` array + `filters` array; `src/lib/reports/` is the
  shared engine: `fields.ts` is the field catalog (raw Archive columns +
  computed ones like `fileCount`/`storageBytes`/`missingMandatoryFolders`),
  `execute.ts` runs a template against real data (respecting
  `archiveVisibilityWhere`), `export-excel.ts`/`export-pdf.ts` render
  results. The 7 SRS reports (Archive Register, Documents by Event/Year,
  Upload Activity, Storage Usage, Missing Documents, User Activity) are
  seeded as `ReportTemplate` rows with `isSystemDefault: true` — they are
  data, not code. Don't add new hardcoded report pages; add fields to the
  catalog instead.
- Report template names are unique per org (`organizationId_name`) —
  `saveReportTemplate` checks for this before creating and returns a
  friendly message rather than letting the DB throw P2002.

## Dashboard, Archive Health, notifications (Prompt 6)
- Dashboard layout matches `ngo-archive-wireframe.html`: 8 summary cards
  (Events/Programs/Documents/Photos/Videos/Reports/Pending Review/Storage
  Used), Recent Archives table (Date/Archive/Type/Status/Health),
  Quick Actions, Recent Uploads feed, Archive-by-Category chip row. Data
  helpers live in `src/lib/dashboard-data.ts`. "Events" vs "Programs" is
  not a schema distinction — both roll up from the same Archive table
  split by category name (Events/Conferences/Campaigns vs NGO Projects),
  since there's no separate Program entity.
- **Archive Health** (HANDOFF.md point 6): `src/lib/archive-health.ts`
  combines missing-mandatory-folder count with workflow position into one
  of `healthy` / `needs_attention` / `critical`. As of Prompt 7 this is
  driven by the org's configured `WorkflowState` (`isInitial`/
  `isTerminal`), not hardcoded status strings — see below.
- **Notifications**: `Notification` model, one row per recipient (no
  fan-out join table — read state is inherently per-user). Triggers wired
  so far: archive created → all Admins (`notifyAdmins`), upload completed →
  archive's creator (unless self-upload), status → Pending Review → all
  Admins, storage ≥80% of `Organization.storageQuotaBytes` → all Admins
  (deduped to once per 24h, checked inline after each upload in
  `src/lib/storage-usage.ts` rather than via a scheduled job). "Missing
  documents" is intentionally *not* a push notification yet — it's
  surfaced continuously via the Archive Health badge instead of firing a
  duplicate event on every empty-folder check.
- `storageQuotaBytes` defaults to null (no limit) — set it per org via
  Prisma Studio or a future settings page; nothing in the UI configures it
  yet.

## Configurable approval workflow (Prompt 7 — last prompt in the sequence)
- `Archive.status` stays a plain string (it always was — not an enum), so
  no data migration was needed. `WorkflowState` (org-scoped) is the
  *declared vocabulary* of valid status values, with `isInitial`/
  `isTerminal` flags; `WorkflowTransition` is a from→to pair plus a
  `requirements` JSON array. `src/lib/workflow/` is the engine:
  `requirements.ts` (two requirement kinds — `mandatoryFoldersFilled` and
  `fieldRequired`; add new kinds here, no migration needed since it's
  JSON), `engine.ts` (`getAvailableTransitions()` — the single source of
  truth for what moves are currently allowed, used by both the UI and the
  action that performs the move), `health.ts` (resolves a status string
  against `WorkflowState` for Archive Health).
- Status can **only** change via `transitionArchiveStatus()` in
  `src/app/actions/archives.ts` — it re-evaluates requirements
  server-side and rejects the move if unmet, even though the UI already
  disables the button for unmet requirements (never trust the client flag
  as the authorization boundary). `updateArchiveMetadata()` no longer
  accepts a `status` field at all — this was removed on purpose so the
  free-form metadata form can't bypass workflow gating.
- If an org hasn't configured any `WorkflowState` rows (or an archive's
  status doesn't match any configured state name), health resolution
  falls back to "neither initial nor terminal" → `needs_attention`,
  rather than silently reporting healthy. This matters if a workflow gets
  edited and a state is renamed/removed out from under existing archives.
- Settings UI at `/settings/workflow` (canManageSettings only): add/remove
  states, add/remove transitions with checkbox-selected requirements.
  Demo org is seeded with Draft (initial) → Pending Review → Archived
  (terminal), where the last transition requires all mandatory folders
  filled — see `prisma/seed.ts`.
- Verified live: an archive sitting in a non-terminal workflow state with
  empty mandatory folders shows "Needs attention"; attempting to move to
  a terminal state with unmet requirements is blocked with the specific
  unmet requirement shown; after uploading to every mandatory folder the
  same transition becomes available and, once taken, health flips to
  "Healthy".

This was the last prompt in `CLAUDE_CODE_PROMPTS.md`. If resuming this
project, check with the user for next steps — there's no Prompt 8 defined
in the plan; further work should come from a new decision, not an
assumed continuation.

## Automated backups (post-Prompt-7, closing a PRODUCT_ROADMAP.md Phase 2 gap)

PRODUCT_ROADMAP.md lists "audit trail, automated backups" as a Phase 2
item (NFR-5: daily automated backups, RPO ≤24h, RTO ≤8h). Everything else
in that phase was already covered by Prompts 3/5/6; this closed the one
remaining gap.

- `scripts/backup/run-backup.ts` (`npm run backup`) exports every Prisma
  model to JSON (one file per table, in FK-dependency order — see
  `scripts/backup/models.ts`) plus a copy of `storage/uploads/`, into a
  timestamped `backups/<ISO-timestamp>/` directory with a `manifest.json`
  (row counts, duration, file count). Old backup directories past
  `BACKUP_RETENTION_DAYS` (env var, default 30) are pruned automatically
  on each run.
- **Why JSON export instead of `pg_dump`**: this sandbox's local dev DB is
  Prisma's embedded WASM Postgres with no `pg_dump` binary on PATH. A
  Node-native export works against any Postgres (including that one) with
  zero external dependencies, and was chosen deliberately over shelling
  out to `pg_dump` — see the decision in this session's history. It is
  **not** a byte-identical Postgres dump; for a real production deployment
  with `pg_dump` available, that's the more standard/robust choice and
  this script's manifest-driven approach could be swapped in without
  touching the app UI (`getBackupStatus()` in `src/lib/backup-status.ts`
  just reads whatever's in `backups/`, agnostic to how it got there).
- `scripts/backup/run-restore.ts` (`npm run backup:restore -- <dir>`)
  reverses the process — `createMany({ skipDuplicates: true })` per model
  in the same dependency order. Intended for disaster recovery into a
  fresh/empty database, not reconciliation against live data.
- **Verified end-to-end in this session**: ran a real backup, wiped every
  table in the dev database (with explicit user confirmation first — this
  is genuinely destructive), ran the restore, confirmed every table's row
  count matched the manifest exactly, and confirmed the app actually
  works against the restored data (login, dashboard, search all
  functioned correctly) — not just that row counts matched.
- Dashboard shows a backup-status banner (Administrator/canManageSettings
  only) — green if the last backup is under 24h old, red "overdue" past
  that, matching the NFR-5 RPO target.
- **Scheduling** (this only runs when invoked — nothing calls it
  automatically yet):
  - **Linux/macOS (cron)**: `0 2 * * * cd /path/to/archivo && npm run backup >> /var/log/archivo-backup.log 2>&1` (daily at 2am).
  - **Windows (Task Scheduler)**: create a Basic Task, daily trigger,
    action = `npm.cmd`, arguments = `run backup`, start-in = the project
    directory.
  - **Managed hosting** (Vercel, etc.): use the platform's Cron Jobs
    feature to hit a protected API route that shells out to the same
    logic, or run this as a separate scheduled job/container against the
    same `DATABASE_URL` — `next dev`/`next start` do not run background
    cron themselves.
- `backups/` is gitignored (never commit real data dumps) with a
  `.gitkeep` placeholder, same pattern as `storage/uploads/`.

## Phase 3 polish (PRODUCT_ROADMAP.md) — in progress

Working through Phase 3's polish items one at a time: watermarking →
video thumbnails/duration → email notifications → mobile-responsive pass.

### Watermarking (FR-11.5) — done
- `Organization.watermarkEnabled` / `watermarkText` (null text falls back
  to org name at render time). Settings UI at `/settings/security`
  (canManageSettings only).
- **Images**: `src/lib/watermark.ts` (`applyImageWatermark`, using
  `sharp`) composites a semi-transparent SVG text overlay at download
  time in `src/app/api/files/[id]/download/route.ts` — the *stored*
  file is never modified, only the response bytes. Verified with a real
  pixel-level check: watermark-enabled downloads have measurably
  different image statistics than the original; watermark-disabled
  downloads are byte-for-byte identical to the original.
- **PDF report exports**: `buildPdfReport()` in
  `src/lib/reports/export-pdf.ts` takes an optional `watermarkText` and
  draws a repeated, rotated, low-opacity text pattern across every page
  (via `pdf-lib`'s `degrees()` helper, not a hand-rolled rotation). Wired
  in `src/app/reports/[id]/export/route.ts`. Only PDF, not Excel — Excel
  cells don't have an equivalent "background watermark" concept.
- **Scope decision**: watermarking only covers images and PDF report
  exports, not raw Word/Excel/PowerPoint file downloads — properly
  watermarking those needs format-specific document manipulation, not
  just an overlay, and was explicitly descoped as a separate, bigger task
  if ever needed.

### Video thumbnails & duration (FR-6.2) — done
- `File.thumbnailPath` / `File.durationSeconds`, populated best-effort at
  upload time in `saveUploadedFile()` (`src/lib/file-storage.ts`) for
  `fileType === "video"` — extraction failure never blocks the upload,
  both fields just stay null.
- `src/lib/video-processing.ts` shells out directly to the `ffmpeg`/
  `ffprobe` binaries bundled by `ffmpeg-static`/`ffprobe-static` (no
  system ffmpeg install needed) via `child_process.execFile` —
  `fluent-ffmpeg` was deliberately avoided since it's an unmaintained
  wrapper package.
- **Critical gotcha — do not remove**: `next.config.ts` has
  `serverExternalPackages: ["ffmpeg-static", "ffprobe-static"]`. Without
  this, Turbopack bundles these packages into the server chunk and
  rewrites their `__dirname`-based binary path resolution to a virtual
  `\ROOT\node_modules\...` path that doesn't exist on disk — the upload
  silently succeeds but thumbnail/duration extraction fails every time
  with an ENOENT spawn error (caught and swallowed, so nothing visibly
  breaks except the feature not working). Confirmed by testing: works
  perfectly when the ffmpeg/ffprobe functions are called directly in a
  plain Node script, fails only when called from inside the Next.js
  server bundle — this is what `serverExternalPackages` fixes. If you add
  another native-binary npm package later, check this list first.
- Also note: changing `next.config.ts` requires killing and restarting
  the dev server (not just triggering an HMR reload) — Next.js reads this
  file once at startup.
- Thumbnails are served via a separate, lighter route
  (`/api/files/[id]/thumbnail`) that does NOT write a `FileDownload` row
  or audit-log "download" entry — viewing a preview thumbnail isn't a
  file download for FR-4.6 purposes.
- Verified end-to-end with a real generated MP4 (via ffmpeg itself):
  uploaded through the Migration Inbox UI, confirmed a valid JPEG
  thumbnail (checked magic bytes) was generated and served, and the
  correct duration ("0:03" for a 3-second clip) displayed in both the
  inbox list and archive detail file rows
  (`src/app/archives/[id]/file-row.tsx`).

### Email notifications (FR-10.2) — done
- `src/lib/email.ts` wraps `nodemailer`; `SMTP_HOST` env var gates
  everything — unset it and email sending no-ops silently (in-app
  notifications still work). Dev default points at a local MailDev
  catcher: run `npx maildev` (web UI at http://localhost:1080, SMTP on
  1025) to actually see/verify sent emails. `.env` already has
  `SMTP_HOST=localhost` / `SMTP_PORT=1025` set for this.
- **Single wiring point, no per-trigger duplication**: `notify()` and
  `notifyAdmins()` in `src/lib/notifications.ts` (already the sole path
  every existing trigger uses — archive created, upload completed, review
  pending, storage limit) now also call `sendEmailIfEnabled()` internally.
  No changes were needed at any call site.
- `User.emailNotificationsEnabled` (default `true`) is a per-user opt-out,
  editable at `/profile` (new page — first "account settings for the
  logged-in user" page in the app, previously only org-level settings
  existed). Email failure (bad SMTP config, mail server down) is caught
  and logged, never thrown — it must not block the action that triggered
  the notification.
- **Verified for real, not just "no errors thrown"**: cleared MailDev's
  inbox via its REST API, triggered an archive-creation notification
  through the running app, and confirmed via `GET http://localhost:1080/email`
  that MailDev actually received an email addressed to the right
  recipient with the correct subject/body. Separately verified that
  disabling the preference at `/profile` suppresses the email (0 received)
  while the in-app `Notification` row is still created — email is
  strictly additive, never a replacement path.
- For production: point `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/
  `SMTP_SECURE` at a real provider (SendGrid, SES, etc.); no code changes
  needed, `getTransport()` in `email.ts` already reads all of this from env.

### Mobile-responsive pass — done
- Root-cause fix, not page-by-page patching: `body` in `layout.tsx` is
  `flex flex-col`, so every page's `<main>` is a flex item. A flex item's
  layout width is resolved from its content *before* the flex container's
  width constraint is reapplied — a wide table (even one already wrapped
  in its own `overflow-x-auto` div) could still force the whole page to
  scroll sideways on narrow screens, no matter how the individual page
  was styled. Fixed once in `globals.css`: `body { overflow-x: hidden }`
  clips any such leak at the top level, `body > main { min-width: 0 }`
  lets flex items actually shrink. Internal scrollable regions (data
  tables) keep scrolling correctly within their own wrapper — only the
  *whole-page* sideways scroll is what's blocked.
- **Testing gotcha**: `document.documentElement.scrollWidth >
  document.documentElement.clientWidth` is the wrong check once
  `overflow-x: hidden` is in play — `scrollWidth` reports the pre-clip
  layout size regardless of whether it's actually visible/scrollable.
  The right test is whether `window.scrollX` changes in response to a
  horizontal scroll attempt (it shouldn't, anywhere in the app).
- 13 pages sharing the `mx-auto max-w-* p-8` shell were switched to
  `p-4 sm:p-8` (32px padding eats a lot of a 375px screen). Several forms
  with multiple `<select>` elements or icon+metadata rows
  (`add-transition-form.tsx`, `add-folder-form.tsx`, `file-row.tsx`,
  the dashboard header, the reports run page's export/delete button row)
  got `flex-wrap` added where they previously assumed enough horizontal
  space. `audit-log/page.tsx`'s table was missing the `overflow-x-auto`
  wrapper every other table in the app already had — added for
  consistency. `metadata-form.tsx`'s field grid is now `grid-cols-1
  sm:grid-cols-2` instead of a fixed 2-column grid.
- Verified across all 15 distinct pages (including pages with real data —
  an archive detail page, a report run page with 8 columns) at a 375px
  viewport (iPhone SE size): none are horizontally scrollable as a whole
  page; wide tables still scroll correctly within their own bounded
  region.

## Material Design 3 design system (org-themable, added 2026-07-03)

The whole UI follows Google's Material Design 3, driven by **runtime
design tokens generated per organization**. This *supersedes* the earlier
"no custom CSS color tokens" decision — the reason it was revisited is
that org-configurable theming (a product requirement: one settings page
that restyles everything) is impossible without tokens.

**How theming flows, end to end:**
1. `Organization.themeSeedColor/themeMode/themeShape/themeFontScale`
   (schema) — edited at `/settings/appearance` (canManageSettings), with
   a client-side live preview. `User.themePreference` overrides the org's
   light/dark default per user (top-bar toggle, cycles
   light→dark→system).
2. `src/lib/theme/scheme.ts` — seed hex → full MD3 color-role vocabulary
   (light+dark) via Google's `@material/material-color-utilities`
   (`SchemeTonalSpot` + `MaterialDynamicColors`), plus harmonized custom
   `success`/`warning` roles (`customColor` with `blend: true`). Pure and
   isomorphic on purpose — the appearance page reuses it client-side.
3. `src/lib/theme/css.ts` — emits the `--md-sys-color-*` /
   `--md-sys-shape-corner-*` variable stylesheet (memoized per settings
   tuple). Dark mode = `<html data-theme="light|dark|system">` rendered
   by the server (no flash, no client script); dark vars apply under
   `[data-theme="dark"]` and via media query under `[data-theme="system"]`.
4. `src/app/layout.tsx` injects that CSS with React 19's hoistable
   `<style href precedence>`, reading the org via `getShellUser()`
   (`src/lib/dal.ts` — session + role + organization, null when logged
   out → login renders chrome-free).
5. `globals.css` `@theme inline` maps every variable into Tailwind
   utilities: `bg-primary`, `text-on-surface-variant`,
   `border-outline-variant`, `bg-surface-container-high`, etc. State
   layers are precomputed colors (`bg-primary-hover`, `bg-on-surface-8`
   …). `rounded-xs/sm/md/lg/xl` = the MD3 shape scale (so the org shape
   setting restyles every corner); `shadow-elevation-1..5` = MD3
   elevation; `.type-display-large` … `.type-label-small` = the 15-role
   MD3 type scale (rem-based so the org font scale applies).

**Never hardcode Tailwind palette colors** (`slate-500`, `red-600`, …) —
the codebase has zero of them; always use the token utilities above.

**Icons**: Material Symbols variable font, **self-hosted** at
`src/fonts/material-symbols-outlined.woff2` via `next/font/local` —
`next/font/google` does NOT have Material Symbols in its registry
("Unknown font" at build). Use `<Icon name="search" />`
(`src/components/icon.tsx`, ligature-based, any name from
fonts.google.com/icons); `filled` prop = FILL axis for active nav states.

**App shell** (`src/components/shell/`): `AppShell` (in the root layout,
signed-in only) = MD3 navigation rail on md+ / modal drawer on mobile
(role-gated destinations + "New archive" FAB) + top app bar (brand,
theme toggle, notification bell, avatar menu with sign-out). Pages
render their own `<main>`; the shell only provides chrome. Notifications
are fetched in the layout; their mark-read actions revalidate the layout.

### Component library (`src/components/ui/`, barrel export `index.ts`)
- **`Button`** — MD3 variants `filled`/`tonal`/`elevated`/`outlined`/
  `text` + `filled-error`/`tonal-error`/`outlined-error`/`text-error`;
  `size` `sm`/`md`/`lg`/`inline` (`inline` = bare text trigger in dense
  rows); `icon` (leading Material Symbol), `loading`/`loadingText`,
  `href` renders a `<Link>`.
- **`IconButton`** — 40px round icon button (`standard`/`filled`/`tonal`/
  `outlined`); `label` is mandatory (accessible name + tooltip).
- **`TextField`/`SelectField`/`TextareaField`/`CheckboxField`/`SwitchField`**
  — label-above MD3 fields (`compact` for dense filter rows);
  `SwitchField` is a spec MD3 switch for boolean settings.
- **`Badge`** — `tone` `neutral`/`success`/`warning`/`danger`/`info`
  mapped to container/on-container pairs (success/warning are the
  harmonized custom roles, so badges re-tint with the seed);
  `pill={false}` = bare colored text tag.
- **`Card`** — `variant` `outlined` (default)/`elevated`/`filled`; `tone`
  `danger`/`warn` for error/warning containers. `className="p-0"` when
  children manage their own padding (folder cards).
- **`PageHeader`** — back link (icon + label), headline-small title,
  supporting text, right `actions` slot.
- **`Table`/`TableHead`/`Th`/`Td`/`TableRow`/`TableEmptyState`** — MD3
  data table incl. the required `overflow-x-auto` wrapper (see the
  mobile-responsive note above).
- **`Dialog`/`ConfirmSubmitButton`** — native `<dialog>`-based MD3 dialog;
  `ConfirmSubmitButton` guards destructive server-action forms (opens the
  dialog, on confirm submits the enclosing form). Used for archive/report
  deletion instead of instant destructive clicks.
- **`SnackbarProvider`/`useSnackbar`/`SnackbarOnMount`** — global MD3
  snackbar (provider mounted in the root layout); settings forms toast on
  success.
- **`CircularProgress`/`LinearProgress`** — loading spinner (used by
  Button `loading`) and determinate meter (storage usage, flips to error
  ≥90%).
- **`EmptyState`** — icon-in-tonal-circle + title + description + CTA;
  used on search/inbox/reports/dashboard empties.
- **`Menu`/`MenuItem`/`MenuFormItem`/`MenuSeparator`** — anchored MD3
  menu (avatar menu; `MenuFormItem` submits a wrapping server-action
  form, e.g. logout).
- **`ExtendedFab`** — the "New archive" FAB in the rail/drawer.
- **`cn()`** (`src/lib/cn.ts`) — `clsx` + `tailwind-merge`.
- `src/lib/file-icon.ts` — fileType → Material Symbol name for file rows.

**Intentionally NOT migrated to `Button`**: bare inline text triggers in
dense rows (`folder-upload.tsx`'s upload trigger, `file-row.tsx`'s
download links) — a Button box model would break those rows. Judgment
over mechanical conversion.

### Settings IA
`/settings` is a hub page (canManageSettings) linking: Appearance (MD3
theming), Organization (name/industry/**storage quota** — the quota
finally has UI; usage meter shown), Folder templates, Workflow,
Integrations, Security & watermarking. `/profile` is per-user (email
opt-out, theme note, identity card).

### Gotchas hit during the MD3 build (2026-07-03)
- **`next/font/google` has no Material Symbols** — self-host via
  `next/font/local` (see Icons above).
- **`prisma db push` did not regenerate the client** in this setup — run
  `npx prisma generate` after schema changes, **and restart the dev
  server**: the running server keeps the old client in memory and throws
  "Unknown argument" on new fields even after regeneration.
- **CSS comments in `globals.css` must not contain `*/`-like sequences**
  (e.g. writing "text-*/font-*" inside a comment terminates it and breaks
  the whole stylesheet parse).
- `.playwright/*.mjs` are ad-hoc smoke-walk scripts (login → every page →
  theme toggle → appearance reseed → mobile). `playwright` is a
  devDependency; screenshots go to the session scratchpad. Reuse/extend
  them for future UI verification.

## UX/product upgrade pass (2026-07-03, same day as the MD3 build)

A large "make it feel like a real product" pass, all built on the MD3
system above — no new design language, just more capable components and
a few closed feature gaps. New dependencies: `@dnd-kit/core` +
`@dnd-kit/sortable` + `@dnd-kit/modifiers` + `@dnd-kit/utilities` (drag +
keyboard reorder), `archiver` (v8 API — `new ZipArchive({...})` +
`.file()`/`.finalize()`, **not** the old `archiver('zip')` factory
function; already present transitively via `exceljs` so this was a
near-zero-cost promotion to a direct dependency).

### Combobox — replaces every `<SelectField>` (`src/components/ui/combobox.tsx`)
Hand-rolled on `Menu.tsx`'s outside-click/Escape skeleton (deliberately
not a headless library — matches how Dialog/Menu/Snackbar were already
built). Searchable, clearable (✕ icon or Backspace/Delete when the input
shows a selected value verbatim), keyboard nav, optional `renderOption`
for richer per-row info. Renders a hidden `<input type="hidden">`
alongside the visible text input so it drop-in replaces `SelectField` in
existing native-form-submission pages with zero server-side changes.
`SelectField` itself still exists (unused now, kept as a plain-`<select>`
primitive) — don't reintroduce raw `<select>` call sites, use `Combobox`.

**Two real bugs found and fixed here, both worth knowing about if this
component acts up again:**
1. **Never pass a Server Component function prop (e.g. a custom
   `renderOption` closure) into `Combobox` from a Server Component** —
   it's a Client Component, and passing a function across that boundary
   crashes the page with "Functions cannot be passed directly to Client
   Components." (Hit on the audit-log actor filter; fixed by relying on
   Combobox's built-in default `description` rendering instead of a
   custom `renderOption`.)
2. **The input used to open its dropdown `onFocus`, not just on click/
   type/ArrowDown.** Harmless standalone, but native `<dialog>` elements
   auto-focus their first focusable child on `showModal()` — so any
   Combobox that happened to be the first focusable element inside a
   `Dialog` popped its dropdown open immediately, sometimes covering the
   dialog's own submit button (hit building the file-share dialog's
   "Link expires" field). Fixed by moving the open-trigger to `onClick`
   only; typing (`onChange`) and ArrowDown still open it as before.

### DataTable — pagination/columns/export (`src/components/ui/data-table.tsx`, `src/hooks/use-data-table.ts`)
Built once, composed on top of the existing `Table` primitives (which
stay untouched elsewhere). Client-side pagination over the full fetched
row set — not server-side LIMIT/OFFSET — matching current data volumes
(audit-log, reports, search all cap well under 1000 rows); revisit if
an org's data grows much past that. Column show/hide + drag/keyboard
reorder via a `DataTableColumnPicker` popover (dnd-kit, not draggable
`<th>` elements). Export is deliberately NOT built into the component —
`buildExcelReport`/`buildPdfReport` (`src/lib/reports/export-*.ts`) were
generalized to take `{key, label}[]` columns instead of report-specific
field lookups, and each consuming page owns a tiny export route
(`src/app/{audit-log,search}/export/route.ts`) that reruns its own query
— no single "god route" for every entity type. Retrofitted into
audit-log (dropped the old hard `take: 100`), the reports run page, and
search (previously a bare `<ul>`, first real use of `Table` there).
Dashboard's "Recent Archives" widget was deliberately **not** converted —
it's a hard-capped 10-row preview with its own "View all → Search" link,
not a data-management view.

### Tree view + bulk zip download (`src/components/tree-view.tsx`, `tree-view-selection.tsx`)
Two-level tree (Archive → Folders → Files) replacing the old flat
folder-card list on the archive detail page — intentionally not a
generic n-depth component, since `Folder` has no `parentFolderId` in the
schema. `TreeSelectionProvider` holds a flat `Set<fileId>` as the single
source of truth; folder/archive-level checkboxes derive
checked/indeterminate from their descendant file ids
(`useGroupCheckState`) rather than tracking their own state.
`TriStateCheckbox` (`src/components/tri-state-checkbox.tsx`) sets the
native `indeterminate` DOM property via a ref, since React has no prop
for it. Selecting files shows a floating `BulkSelectionBar`
(`src/components/bulk-selection-bar.tsx`) → POSTs to
`/api/files/bulk-download`, which re-validates every file id against the
current user's org scoping server-side (never trusts the client list)
and streams a `ZipArchive` response. One summary `AuditLog` row per bulk
request, but still one `FileDownload` row per file so per-file download
counts stay accurate elsewhere.

### Workflow stepper (`src/components/workflow/workflow-stepper.tsx`)
Visualizes the org's `WorkflowState` sequence (by `order`) as a
horizontal stepper on the archive detail page, replacing the old flat
list of transition buttons — past states filled/checked, current
highlighted, reachable-next-state(s) clickable. **Deliberately linear**:
the underlying `WorkflowTransition` graph can technically connect any two
states, not just adjacent ones in `order`, but this draws states 1..N in
sequence regardless and just marks whichever are currently reachable —
not a general graph layout. The settings-page editor
(`src/app/settings/workflow/{workflow-state-editor,transition-graph}.tsx`)
reuses the same simplification: states are a dnd-kit reorderable list,
transitions between adjacent states render as an inline edge (click to
see/change requirements), non-adjacent transitions list separately below
as "Other transitions."

### Reorder-and-persist pattern (folder templates, workflow states, DataTable columns)
The same shape three times: dnd-kit `DndContext` (pointer + keyboard
sensor) wrapping a `SortableContext`, `onDragEnd` computes the new order
client-side for instant feedback, then a server action does a full
`0..n-1` renumber of the whole set (`reorderFolderTemplates`,
`reorderWorkflowStates` in their respective `src/app/actions/*.ts`) —
never a sparse two-item swap, since `order` values aren't guaranteed
contiguous after past deletions.

**Gotcha (found and fixed this session): every `DndContext` needs an
explicit, stable `id` prop.** dnd-kit's `useUniqueId()` falls back to a
module-level mutable counter when no `id` is given, which increments
differently on the server (resets every request) vs. the client
(persists across client-side navigations) — mounting a second
`DndContext` anywhere in the same browser session produces a
server/client `aria-describedby` mismatch and a full **hydration error**
that discards and re-renders the whole subtree. Confirmed by reproducing
it (navigate folder-templates → workflow settings client-side) and
fixing it by passing a stable id to every `DndContext`
(`"workflow-states"`, `` `folder-templates-${categoryId}` ``, and for
`DataTableColumnPicker`, `` `${storageKey}-columns` `` threaded through
from `DataTable`). If a new `DndContext` is added anywhere, give it an
explicit id from the start.

### Upload progress (`src/components/upload/{use-file-upload,upload-progress-list}.tsx`)
Server Actions can't expose upload progress (no XHR/fetch-upload-progress
event reaches them), so the old `uploadToInbox`/`uploadToFolder` Server
Actions were deleted and replaced with `POST /api/upload`
(`src/app/api/upload/route.ts`) called via `XMLHttpRequest` specifically
(not `fetch` — `xhr.upload.onprogress` is the reliable cross-browser
signal), one XHR per file so each gets its own progress bar and
completion checkmark rather than one aggregate bar. The shared
folder-resolution/save/notify/storage-check logic that used to live in
those two actions is now `processUpload()` in `src/lib/file-storage.ts`,
called by the new route.

### File preview (`src/components/file-preview/file-preview-dialog.tsx`, `/api/files/[id]/preview`)
New inline-disposition route mirroring the download route's auth/org
scoping and `canDownload` gate, but — like the existing thumbnail route —
does **not** write a `FileDownload`/audit row (viewing isn't downloading).
Per-type: image/video/audio render natively, PDF via `<iframe>` with a
direct-link fallback, Office kinds show the file icon + existing "Open in
editor" button when configured, everything else is download-only. No new
embed capability for Office files beyond what the Google/Microsoft
connector already provided — a generic in-browser Office viewer was
explicitly descoped as a much bigger integration.

### File sharing (`src/app/share/[token]/`, `/api/share/[token]/download`, `ShareLink` model)
Public, unauthenticated link sharing, per-file only (not folder/archive —
that's what bulk zip download covers for the authenticated case). New
`ShareLink` model: `token` (unique, public), optional `expiresAt`/
`maxDownloads`, `downloadCount`. The public page and download route need
no proxy.ts changes — `protectedRoutes` only ever listed `/dashboard`,
and `layout.tsx` already renders chrome-free for any request with no
session cookie (same as `/login`). Download-limit enforcement is
race-safe: the download route does `updateMany({ where: { downloadCount:
{ lt: maxDownloads } } })` so two simultaneous requests at the last slot
can't both succeed. Share dialog on each file row generates the link
plus zero-dependency `wa.me`/`mailto:` share buttons (Material Symbols
has no WhatsApp brand glyph, so a generic `chat` icon + text label is
used instead of sourcing a one-off asset).

### Roles & Permissions (`/settings/roles`, `src/app/actions/roles.ts`)
UI for the 10 existing `Role` boolean flags — no schema change, no new
granular permission model. Page itself gates on `canManageSettings`
(consistent with every other `/settings/*` page); the user-role-
assignment table additionally requires `canManageUsers` on the action
side, since assigning a person to a role is more of a user-management
action than a settings-shape one. Deleting a role that still has users
assigned is blocked with a specific count in the message
(`prisma.user.count({ where: { roleId } })` guard) rather than letting
the required FK constraint throw. No user creation/deactivation was
added — only role CRUD and assigning *existing* users to roles.

### Profile: password change + avatar (`src/app/profile/`, `User.avatarPath`)
`changePassword` verifies the current password via the same
`bcrypt.compare` pattern as login, hashes the new one at the same cost
factor `prisma/seed.ts` uses (10). `uploadAvatar`/`saveAvatar` (in
`file-storage.ts`) is a simpler sibling of `saveUploadedFile` — no
versioning chain, resizes to a 256×256 JPEG via `sharp` (already a
dependency, used for watermarking) so avatars never balloon storage
regardless of what's uploaded, stored under `storage/avatars/` (parallel
to `storage/uploads/`). Served via `/api/users/[id]/avatar` (no audit
write, same precedent as the thumbnail route). Shows in both the profile
page and the top-bar `UserMenu` avatar button (falls back to computed
initials when `avatarPath` is null, same as before).

### Print-friendly reports
Same-route approach, not a separate `/print` page: a `.no-print` utility
class (`@media print { .no-print { display: none !important } }` in
`globals.css`) hides the app shell's nav rail/top bar
(`AppShell`/`PageHeader`'s back-link) and the DataTable's own toolbar/
pager, a `PrintButton` calls `window.print()`. No page-break-per-row
logic — browsers handle table breaking reasonably on their own.

### Verification note
Every item above was verified live (not just `tsc`/lint), including
generating a real share link and downloading it from a completely
separate unauthenticated `BrowserContext`, inspecting a downloaded zip's
actual contents via `unzip -l`, and checking pixel content of a resized
avatar via `sharp`. Two of the bugs above (Server→Client function prop,
Combobox focus-opens-in-dialog) were caught specifically because of this
— they wouldn't have shown up in type-checking alone.

## Dashboard redesign + global ⌘K command palette (2026-07-03, same day, user-requested)

### Dashboard (`src/app/dashboard/page.tsx`)
Restructured for clearer visual hierarchy without touching
`dashboard-data.ts`'s query shape: widened to `max-w-7xl`; header is now a
greeting (`Good morning/afternoon/evening, {firstName}`) + org name with a
role-gated **quick-actions row** (`Button` pills: New Archive, Migration
Inbox, Search, Reports, Audit Log, Settings — same gating booleans as
`AppShell`'s nav items, not duplicated logic, just re-derived per page).
Stat cards now use a tonal icon chip (`bg-primary-container`/
`bg-warning-container` circle) instead of a bare icon in the corner, for
clearer scannability at a glance. Recent Archives / Recent Uploads /
Archive by Category are now wrapped in `Card variant="elevated"` with a
bordered header row, instead of a bare `<h2>` floating directly on the
page background — makes the sections read as distinct panels rather than
a continuous list. Recent Uploads now calls `fileTypeIcon()` (was
hardcoding a single `draft` icon for every file) so it's consistent with
the file-row and tree-view icon treatment. Backup status banner switched
from `variant` default (outlined) to `filled` when healthy, keeping
`outlined`+danger tone only for the overdue case, so it reads as a status
strip rather than a full alert box on the common/healthy path.

**Follow-up fix (same day): Recent Archives overflowed its card.** The
first version kept Recent Archives as a `Date/Archive/Status/Health`
`Table` inside a `1.6fr` column of a `grid-cols-[1.6fr_1fr]` layout. CSS
Grid tracks (unlike flex children) don't get an implicit `min-width: 0`,
so once the table's natural content width (four columns of badges/text,
~530-680px depending on content) exceeded the ~370px the grid gave that
column, the *grid track itself* expanded to fit it — pushing the card
past the Recent Uploads column and breaking the whole row, not just
causing an internal scrollbar. Adding `min-w-0` to the card stopped the
grid-track blowout, but that just revealed the second problem: a 4-column
badge-heavy table simply doesn't fit in ~370px, so the table needed
internal horizontal scroll to reach the Health column — bad UX for a
dashboard summary panel someone should be able to scan without touching
it. Fixed by replacing the table with a stacked list (same pattern as
Recent Uploads: name + date on one line, category/status/health badges
wrapping naturally underneath) — no fixed columns, so it can't overflow
at any width. `HealthBadge` gained a `compact` prop (drops the "(N
missing)" suffix into a `title` tooltip) for any future dense context,
though the list layout ended up not needing it here since badges wrap.

**How to apply:** any time a `Table` (or other fixed-width content) sits
inside a CSS Grid column — not a flex child — add `min-w-0` to the grid
item, and check whether the column is actually wide enough for the
content instead of assuming `overflow-x-auto` alone will fix it. A
scrollable-inside-a-card table is an acceptable pattern for a primary/
full-width data view (audit log, search results) but a poor one for a
secondary dashboard summary panel — prefer a list/card layout there
instead of fighting column widths.

### Global search (`⌘K` / `Ctrl+K`, `src/components/command-palette/`)
`CommandPalette` is mounted once in `AppShell`'s top bar (not per-page),
so the shortcut works from anywhere in the app. Two-part result set:
- **Quick actions** — static, role-filtered list of nav destinations
  (same items as the nav rail, plus "New archive" and "My profile"),
  substring-matched client-side with zero network cost.
- **Archives + files** — fetched from a new `GET /api/search/quick`
  route, org/visibility-scoped exactly like `search-archives.ts`
  (reuses `archiveVisibilityWhere`), 2-character minimum, 6 results per
  group, debounced 200ms client-side. Deliberately a separate, smaller
  endpoint from the full `/search` page's query — this is a "jump
  somewhere fast" lookup, not the full filterable search experience.

Built on the same native `<dialog>` skeleton as `Dialog.tsx` (Escape/
backdrop-click to close) but custom-laid-out (top-anchored, wide, no
actions row) since a search palette isn't a confirm/form dialog. Full
keyboard support: type to filter/search, Arrow Up/Down to move the
active row, Enter to navigate, Escape to close.

**Lint-driven refactor worth remembering**: the first draft used
`useEffect` to (a) reset `archives`/`files` to `[]` when the query got
too short, and (b) reset `activeIndex` to `0` whenever the result-list
length changed. Both tripped `react-hooks/set-state-in-effect` — the
project's ESLint config treats synchronous `setState` inside an effect
body as an error, not a warning, so this doesn't slip through unnoticed.
Fixed by deriving instead of syncing: results are stored keyed by the
query they were fetched for (`{ query, archives, files }`), so a stale/
too-short query is detected by comparing the stored key against the
current one rather than needing an effect to clear it; `loading` is
`trimmedQuery.length >= 2 && resultsFor.query !== trimmedQuery` (derived,
not a separate boolean that can fall out of sync); and `activeIndex` is
clamped at read time (`Math.min(activeIndex, items.length - 1)`) instead
of reset via a second effect that would otherwise race the first. General
pattern for this codebase: if an effect's only job is "call setState
because some other state changed," that's almost always a sign the value
should be computed during render instead.

Also avoided a hydration-mismatch trap similar to the ones in
[[gotcha-dndkit-combobox-embedded-db]]: the keyboard-shortcut hint label
was originally going to detect `navigator.platform` (Mac → "⌘K", other →
"Ctrl K") and `setState` from a mount effect — same class of bug as the
`DndContext` id issue, since the server has no `navigator` and would
render one label while the client's effect immediately overwrites it
with another, and even a lazy `useState` initializer risks a text
mismatch against server-rendered HTML. Sidestepped entirely by rendering
a static, platform-agnostic "Ctrl/⌘ K" label instead — not worth the
hydration risk for a cosmetic hint.

## Workflow settings fixes: state pinning, crash fix, row actions (2026-07-05)

**Bug fixed — `TransitionDetail` crash on `t.fromState` of `undefined`**:
`transition-graph.tsx`'s open-detail-panel state (`openId`) was looked up
against the live `transitions` list with a trusting `.find(...)!`. Removing
the currently-open transition left `openId` pointing at a row that no
longer existed after the server revalidated, so `.find()` returned
`undefined` and the `!` lied to TypeScript. Fixed by deriving
`openTransition = transitions.find(...)` once per render (no `!`) and
conditionally rendering — a stale id now just closes the panel instead of
crashing. General lesson for this codebase: any client id/ref into a list
that a server action can delete out from under it needs to tolerate a miss.

**States are now auto-pinned, not just clamped**: initial is always
rendered first, terminal state(s) always last, and neither is draggable —
`workflow-state-editor.tsx` filters them out of the `SortableContext`
entirely (rendered as separate fixed `PinnedStateRow`s with a pin icon
instead of a drag handle) rather than allowing the drag and clamping the
drop target, which was a more complex first attempt. `addWorkflowState`
inserts new states at the matching end automatically (new initial takes
slot 0 and shifts everything else down; new terminal appends at the end;
a new plain state inserts just before the first terminal state) and
rejects a second initial state or a state marked both initial and terminal.

**Row actions**: each state row now reveals a `⋮` icon-button on hover
(`group-hover`/`group-focus-within`, using the existing `Menu`/`MenuItem`
primitive from the avatar menu) with Edit / Duplicate / Delete.
- **Edit** (`edit-state-dialog.tsx`) opens a `Dialog` with name +
  initial/terminal checkboxes, backed by a new `updateWorkflowState` server
  action. **Renaming cascades**: `WorkflowTransition.fromState`/`toState`
  and `Archive.status` are plain strings matched against
  `WorkflowState.name` (not a foreign key — see the schema comment), so a
  rename that only touched the `WorkflowState` row would silently orphan
  every transition and leave existing archives' status unresolvable. The
  action renames all three in one `$transaction`. Verified live: renaming
  a state mid-sequence immediately updated its transition edge's label
  with no reload.
- **Duplicate** (`duplicateWorkflowState`) copies a state as `"<name>
  (copy)"` (incrementing on collision), always as a plain non-pinned state
  regardless of the source's flags — there's no meaningful "duplicate the
  pin," since initial must stay unique.
- **Delete** reuses the existing `removeWorkflowState`, restyled
  (`RemoveStateButton`'s new `asMenuItem` prop) to render as a menu item
  instead of a standalone text button.

Verified end-to-end via a live Playwright walk (add → hover → menu open →
duplicate → edit/rename → delete), confirming zero console/page errors and
correct positioning/cascading at every step, then cleaned up the temporary
test states from the demo org afterward.

