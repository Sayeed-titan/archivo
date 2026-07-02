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

## Shared UI component library (`src/components/ui/`)

Built after an audit found ~15 near-duplicate hand-rolled button class
strings (inconsistent padding, disabled handling), 3 competing input
padding scales, and 4 near-identical badge/pill patterns across the app.
All new UI should use these instead of hand-rolling Tailwind classes —
import from `@/components/ui` (barrel export in `index.ts`).

- **`Button`** (`button.tsx`) — `variant`: `primary`/`secondary`/
  `danger-outline`/`danger-solid`/`ghost`/`danger-ghost`; `size`: `sm`/
  `md`/`lg`/`inline` (`inline` = no padding/radius, for bare text triggers
  in dense rows like a settings-list "remove" link — pair with
  `danger-ghost`). Renders as `<Link>` when given `href`, otherwise
  `<button>`. Has `loading`/`loadingText` props for the
  `useActionState`-pending pattern used everywhere
  (`pending ? "Saving..." : "Save"` no longer needs to be written by hand).
- **`TextField`/`SelectField`/`TextareaField`/`CheckboxField`**
  (`form-field.tsx`) — label + control + error/hint slot in one component.
  `compact` prop switches to the smaller `px-2 py-1` padding used in dense
  inline forms (folder-template add-row, search/audit-log filter bars,
  workflow settings) vs. the default `px-3 py-2` for standalone forms.
  `label` accepts `ReactNode`, not just `string` (needed for labels with
  embedded hint text or quoted field names).
- **`Badge`** (`badge.tsx`) — `tone`: `neutral`/`success`/`warning`/
  `danger`/`info`; `pill` (default `true`) toggles between a rounded pill
  (status badges) and plain colored text (`pill={false}`, for small inline
  tags like "required"/"initial"/"terminal"/"default template").
  `HealthBadge` (`src/components/health-badge.tsx`) is a thin wrapper
  mapping `ArchiveHealthLevel` → tone — the old
  `HEALTH_BADGE_CLASSES` export was removed, nothing else referenced it.
- **`Card`** (`card.tsx`) — `tone`: `default`/`danger`/`warn`. Replaces
  every hand-rolled `rounded-md border ... p-4` panel. Pass
  `className="p-0"` when the card's children need their own internal
  padding structure (e.g. a folder card with a bordered header + list +
  upload zone, each with different padding) rather than the default `p-4`.
- **`PageHeader`** (`page-header.tsx`) — `backHref`/`backLabel` (both
  optional — omit for pages with no back link, e.g. dashboard/login)/
  `title`/`subtitle`/`actions` (right-aligned slot, accepts any
  `ReactNode` — used for action buttons AND for non-button content like a
  `HealthBadge` on the archive detail page).
- **`Table`/`TableHead`/`Th`/`Td`/`TableRow`/`TableEmptyState`**
  (`table.tsx`) — standardizes the `overflow-x-auto` wrapper (required —
  see the mobile-responsive-pass note above on why every table needs
  this) + shell markup used on the dashboard, report run pages, and audit
  log.
- **`cn()`** (`src/lib/cn.ts`) — `clsx` + `tailwind-merge`, for merging a
  component's default classes with a caller-supplied `className` override
  without class-conflict bugs.

**Explicit decision, don't revisit without a reason**: no custom CSS color
tokens (`--color-surface`, etc.) were introduced even though the
wireframe (`ngo-archive-wireframe.html`) defines its own hex palette —
the existing app already uses Tailwind's built-in `slate`/`emerald`/
`amber`/`red`/`blue` palette in 30+ files. Consistency here comes from
routing all UI through these shared components (which use a fixed,
documented set of Tailwind classes internally), not from a parallel
token system that would require migrating every existing color class.

**Intentionally NOT migrated to `Button`**: bare inline text triggers
with no box model at all inside already-dense rows — e.g.
`folder-upload.tsx`'s "Drag files here or click to upload" trigger, and
`file-row.tsx`'s inline metadata-row links. Forcing `Button` (which
always adds `inline-flex`, padding, and `rounded-md`) onto these would
visibly change their sizing inside dense `text-xs` rows. Use judgment
here rather than mechanically converting every `<button>`/`<a>` in the
codebase — the goal is consistency where things are visually the same
kind of control, not a 100%-component-coverage mandate.

