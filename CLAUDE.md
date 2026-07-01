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
  project is being built from (currently on Prompt 6)

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
  combines missing-mandatory-folder count with review status into one of
  `healthy` / `needs_attention` / `critical` — critical is specifically
  "marked Archived but still has empty mandatory folders" (looks done but
  isn't audit-ready). Shown via `<HealthBadge>` on the dashboard table and
  the archive detail page. This is a simple rule, not the configurable
  workflow engine from Prompt 7 — expect it to be rewired once org-defined
  status flows land.
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

