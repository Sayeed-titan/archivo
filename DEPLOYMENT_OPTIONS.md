# Archivo Deployment Options — IIS vs. Vercel vs. Render

This document compares the three hosting paths and gives full setup steps for
each. Read the **Comparison** section first and pick one before following a
walkthrough — they are not equally capable, and two of them require real code
changes, not just configuration.

---

## 0. Why this even matters: the app's two hard requirements

Archivo is not a static site. Wherever it runs, that host must provide:

1. **A persistent disk** — uploaded files and avatars are saved to
   `storage/uploads/` and `storage/avatars/` on disk
   (`src/lib/file-storage.ts`). If the host wipes the filesystem on
   redeploy/idle/restart, **uploaded files are permanently lost**.
2. **A long-running server process** — the app spawns `ffmpeg`/`ffprobe` for
   video thumbnails and accepts uploads up to 500MB. This needs an
   always-on process, not a short-lived serverless function.

Every row in the comparison table below is really just "does this option
satisfy #1 and #2, and at what cost."

---

## 1. Comparison

| | **IIS (local PC)** | **Render** | **Vercel** |
|---|---|---|---|
| **Cost** | $0 (your hardware) | Free tier exists, but **files don't persist on free tier** (disk requires a paid plan) → real cost is **~$14/mo** | Free tier for compute, but has **no built-in persistent disk at all** — requires adding paid storage (Vercel Blob) regardless of plan |
| **Code changes required** | None — app runs as-is | None — already fully set up (`Dockerfile`, `render.yaml`, `DEPLOYMENT.md`) | **Yes, significant** — `src/lib/file-storage.ts` and every file read/write route must be rewritten to use Vercel Blob instead of local disk; ffmpeg processing needs to work within serverless limits |
| **Files survive redeploy** | ✅ yes (real disk) | ✅ yes, but only on a paid plan | ✅ yes, but only *after* the Blob rewrite is done |
| **Reachable by** | Only devices on your local network/WiFi, by default | Anyone on the internet (public URL) | Anyone on the internet (public URL) |
| **Auto-deploy on `git push`** | ❌ no — manual rebuild + service restart each time | ✅ yes | ✅ yes |
| **Who maintains the server/OS/DB** | You (patching, backups, uptime, must stay powered on) | Render (managed) | Vercel (managed) |
| **Setup effort** | High (IIS, URL Rewrite, ARR, NSSM, local Postgres, firewall) | Low (already documented, ~30 min) | Medium-high (storage rewrite) but then low ongoing |
| **Best for** | Internal/office-only use, zero budget, no external users needed | Getting a real public URL fastest, for demos or real use | Long-term production if you specifically want Vercel's platform/CDN and are willing to do the storage rewrite once |

### The honest recommendation
- **Just need it live and testable by outside people, fastest, cheapest real option:** **Render**. Nothing to build — follow `DEPLOYMENT.md` (already in this repo). Free tier is fine for *clicking through the UI*, but budget the ~$14/mo tier once you're testing real uploads, since free-tier has no persistent disk.
- **Internal-only, never need outside access, want $0 forever:** **IIS**. More setup labor up front, no recurring cost, no code changes.
- **Committed to Vercel specifically (team preference, existing Vercel infra, etc.):** **Vercel**, but budget real development time first — this is not a config change, it's a storage-layer migration.

If you have no strong reason to pick Vercel specifically, **Render is the least total effort** of the three "publicly reachable" options, because the work is already done.

---

## 2. Render — full steps

**Already fully documented in this repo: see [`DEPLOYMENT.md`](./DEPLOYMENT.md).**
It covers: prerequisites, pushing to GitHub, deploying via Render's Blueprint
(`render.yaml`), free vs. paid tier tradeoffs, environment variables,
migrations-on-deploy, seeding demo data, and troubleshooting. Nothing in this
document duplicates it — follow that file directly if you choose Render.

Quick summary of the flow:
```
npm install                              # generate package-lock.json (once)
git init && git add . && git commit      # (once)
push to GitHub                           # (once)
Render → New → Blueprint → pick repo → Apply
Fill in sync:false env vars (APP_URL after first deploy)
Render Shell: npm run db:seed            # (once)
—— everyday: git push → Render auto-deploys ——
```

---

## 3. IIS (local PC) + local PostgreSQL — full steps

Use this only if LAN-only access is acceptable — devices outside your
network cannot reach the app unless you separately configure port-forwarding
or a tunnel (not covered here; it meaningfully changes the security posture
of your PC and should be a deliberate, separate decision).

### Part A — Install prerequisites
1. **PostgreSQL** — install PostgreSQL 16/17 for Windows from postgresql.org.
   Set a superuser password during install; keep default port 5432.
2. Create the app's database and user (via pgAdmin or `psql`):
   ```sql
   CREATE DATABASE archivo;
   CREATE USER archivo_app WITH PASSWORD 'choose-a-strong-password';
   GRANT ALL PRIVILEGES ON DATABASE archivo TO archivo_app;
   ```
3. **IIS** — Control Panel → "Turn Windows features on or off" → enable
   **Internet Information Services**.
4. Install the **URL Rewrite** module (IIS.net).
5. Install **Application Request Routing (ARR)** (IIS.net), then in IIS
   Manager → server node → **Application Request Routing Cache** → **Server
   Proxy Settings** → check **Enable proxy**.
6. Install **NSSM** (nssm.cc) — used to run the Node process as a real
   Windows Service.

### Part B — Prepare the app
7. Build it:
   ```powershell
   cd "d:\Departmental\Official Assignements\Achieve Management\archivo"
   npm install
   npx prisma generate
   ```
8. Set production env vars in `.env` (or as service env vars in step 12):
   ```
   DATABASE_URL="postgresql://archivo_app:choose-a-strong-password@localhost:5432/archivo"
   APP_URL="http://<your-lan-ip-or-hostname>"
   SESSION_SECRET="<generate a long random string>"
   ```
   (`SMTP_*`/`GOOGLE_*` optional — omit to disable those features.)
   Do not reuse the `prisma dev` embedded-Postgres URL — that's dev-only.
9. Apply migrations and seed demo data:
   ```powershell
   npx prisma migrate deploy
   npm run db:seed    # once — creates demo org/users; replace before real use
   ```
10. Build for production:
    ```powershell
    npm run build
    ```
    This produces `.next/standalone/` (per `next.config.ts`'s
    `output: "standalone"`).
11. **Finish the standalone bundle manually** (things `output: "standalone"`
    doesn't auto-copy):
    - Copy `.next/static/` → `.next/standalone/.next/static/`
    - Copy `public/` → `.next/standalone/public/`
    - Verify `.next/standalone/node_modules/ffmpeg-static` and
      `ffprobe-static` contain their actual binaries (not just
      `package.json`) — if missing, copy those two folders in from the
      top-level `node_modules/`. (The `Dockerfile` does this copy
      explicitly for the same reason — standalone tracing can miss
      packages that resolve binaries via `__dirname` at runtime.)
    - Create `storage/uploads/` and `storage/avatars/` folders inside
      `.next/standalone/` (wherever you'll launch `server.js` from).

### Part C — Run it as a Windows Service
12. ```powershell
    nssm install Archivo
    ```
    In the GUI: **Path** = your `node.exe`; **Startup directory** =
    `.next/standalone`; **Arguments** = `server.js`. On the **Environment**
    tab, add `PORT=3000` plus every var from step 8 (NSSM services don't
    read `.env` automatically). Set **Startup type** to Automatic.
    ```powershell
    nssm start Archivo
    ```
    Confirm `http://localhost:3000` loads the app before touching IIS.

### Part D — IIS reverse proxy
13. IIS Manager → **Sites** → **Add Website** → name `Archivo`, any physical
    path, binding `http`, port 80 (or 8080), host name blank for LAN-IP
    access.
14. In that site's physical path, create `web.config`:
    ```xml
    <?xml version="1.0" encoding="UTF-8"?>
    <configuration>
      <system.webServer>
        <rewrite>
          <rules>
            <rule name="ReverseProxyToNode" stopProcessing="true">
              <match url="(.*)" />
              <action type="Rewrite" url="http://localhost:3000/{R:1}" />
            </rule>
          </rules>
        </rewrite>
      </system.webServer>
    </configuration>
    ```
15. Windows Defender Firewall → Inbound Rules → New Rule → allow TCP on your
    chosen port for the **Private** network profile.

### Part E — Verify
16. `ipconfig` on the host PC for its LAN IP. From another device on the
    same WiFi, browse to `http://<lan-ip>` (or `:8080` if used).
17. Log in, upload a file, then `nssm restart Archivo` and confirm the file
    is still there and downloadable — this is the actual proof the disk
    persists across restarts.

### Ongoing cost of this option
- No `git push` auto-deploy — every change means re-running build steps 7–11
  then `nssm restart Archivo`.
- You own PostgreSQL backups (`npm run backup` still works — schedule via
  Windows Task Scheduler) and all OS/security patching.
- The PC must stay powered on (disable sleep/hibernate) and IIS/the service
  must keep running for the app to be reachable at all.
- **Reachable only on your LAN** unless you separately add port-forwarding/
  dynamic DNS/a tunnel — a distinct decision with real security exposure,
  not covered here.

---

## 4. Vercel + Vercel Blob + Neon Postgres — full steps

This is the only option that requires **application code changes**, not just
configuration — Vercel's serverless functions have no persistent local disk,
so every place the app touches `storage/uploads/`/`storage/avatars/` must be
rewritten to use Vercel Blob instead of `fs`.

### Part A — Database (low effort)
1. Create a Neon Postgres project (via Vercel's integration marketplace, or
   directly at neon.tech).
2. Set `DATABASE_URL` (Neon's pooled connection string) as a Vercel
   environment variable. Prisma 7 + `@prisma/adapter-pg` (already used in
   this project, see `src/lib/prisma.ts`) just needs the new URL — no
   schema changes.
3. Run `npx prisma migrate deploy` against Neon once connected (from your
   local machine with `DATABASE_URL` pointed at Neon, or via a Vercel
   deploy hook).

### Part B — File storage (the real work — must be done before deploying)
4. Add Vercel Blob to the project (Vercel dashboard → Storage → Create →
   Blob), which provisions a `BLOB_READ_WRITE_TOKEN` env var.
5. Rewrite `src/lib/file-storage.ts`: replace `STORAGE_ROOT`/
   `AVATAR_STORAGE_ROOT` filesystem reads/writes with `@vercel/blob`'s
   `put()`/`del()`/`list()` calls. File versioning logic (new upload →
   new `File` row, `previousVersionId` chain) stays conceptually the same;
   only the storage calls change.
6. Update every route that reads from disk to read from Blob URLs instead:
   - `src/app/api/upload/route.ts`
   - `src/app/api/files/[id]/download/route.ts`
   - `src/app/api/files/[id]/preview/route.ts`
   - `src/app/api/files/[id]/thumbnail/route.ts`
   - `src/app/api/users/[id]/avatar/route.ts`
   - `src/app/api/files/bulk-download` (zips files — must stream from Blob)
7. Update `src/lib/watermark.ts` and `src/lib/video-processing.ts` to
   operate on downloaded buffers/temp files instead of local paths, then
   upload the result back to Blob.
8. Update `scripts/backup/run-backup.ts` to copy from Blob instead of
   `storage/uploads/`.

### Part C — Video processing constraint (decision needed)
9. `ffmpeg-static`/`ffprobe-static` spawning child processes inside a
   Vercel serverless function is workable but tighter than a real server —
   test against Vercel's execution-time and package-size limits. If
   unreliable for larger videos, this becomes a separate deferred decision
   (e.g. move thumbnail generation to a queued background job).

### Part D — Deployment config
10. Remove or leave dormant `Dockerfile`/`render.yaml`/`.dockerignore`
    (not used by Vercel).
11. Add a `vercel.json` if you need to override function duration/memory
    for the upload or video-processing routes.
12. Set all remaining env vars in the Vercel dashboard: `SESSION_SECRET`,
    `APP_URL`, `SMTP_*`, `GOOGLE_*`.
13. Re-home backup scheduling on **Vercel Cron Jobs** (hits a protected API
    route) instead of Task Scheduler/cron — already anticipated in this
    project's `CLAUDE.md` scheduling notes.
14. Connect the GitHub repo in the Vercel dashboard → every `git push`
    auto-deploys, same convenience as Render.

### Verification checklist before calling this done
- Upload → versioning → download → preview → thumbnail → bulk zip →
  avatar upload, all against Blob (not local disk).
- A real backup run against Blob-backed storage.
- Video thumbnail/duration extraction tested on an actual Vercel
  deployment, not just local dev — this is the highest-risk item.

---

## 5. Decision checklist

Ask these in order:

1. **Does anyone outside your building/network need to use this?**
   - No → IIS is viable and free forever.
   - Yes → IIS is out; go to Render or Vercel.
2. **Do you want it live today with zero code changes?**
   - Yes → Render.
3. **Is there a specific reason it must be Vercel** (existing team
   infrastructure, a hard platform requirement)?
   - No → Render remains the lower-effort public-hosting choice.
   - Yes → follow the Vercel walkthrough above and budget real dev time for
     the storage-layer rewrite before attempting to deploy.
