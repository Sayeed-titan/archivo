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
  project is being built from (currently on Prompt 2)

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

