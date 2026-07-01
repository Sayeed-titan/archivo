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

