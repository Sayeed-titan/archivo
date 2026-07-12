# Deploying Archivo — a learning guide

This guide takes you from "code on my laptop" to "live on the internet," and
explains *why* at each step so you actually learn deployment, not just copy
commands. It targets **Render** (host) + **GitHub** (code), which is the most
beginner-friendly production-grade combination.

There is a **free path** (for testing) and a **paid path** (for real use). They
use the *same* files — you just flip a couple of settings. Both are called out.

---

## 0. The mental model (read this first)

Your app is not a static website. It is a **living program** that needs three
things a plain web host doesn't give you:

1. **A database** — PostgreSQL. All your archives, users, folders, and audit
   logs live here. (Prisma 7 talks to it via `@prisma/adapter-pg`.)
2. **A persistent disk** — uploaded files and avatars are saved to
   `storage/uploads/` and `storage/avatars/` on disk (`src/lib/file-storage.ts`).
   This disk must *survive restarts and redeploys*.
3. **A long-running server** — the app spawns `ffmpeg`/`ffprobe` for video
   thumbnails, accepts uploads up to 500MB, and processes images with `sharp`.
   These need a real always-on server, not a short-lived serverless function.

**This is why we do NOT use Vercel/Netlify free tiers.** They have no persistent
disk — your uploaded files would vanish on every deploy. Instead we deploy the
whole app as a **Docker container on Render**, with a managed Postgres database
and a persistent disk attached. Same code, no rewrite.

The three pieces and how they connect:

```
  ┌─────────────────────────────────────────────────────┐
  │  GitHub repo (your code)                             │
  │     │  push                                          │
  │     ▼                                                │
  │  Render builds the Dockerfile → runs the container   │
  │     ├── Web Service (the Next.js app)                │
  │     │      ├── mounts a Persistent Disk at /app/storage
  │     │      └── connects to ─────────┐                │
  │     └── Postgres Database  ◄─────────┘  (DATABASE_URL)│
  └─────────────────────────────────────────────────────┘
```

---

## 1. Files created for deployment (what each one does)

You now have these new files in `archivo/`. You don't need to edit them —
just understand them:

| File | Purpose |
|------|---------|
| `Dockerfile` | The recipe Render uses to *build* and *run* your app. Multi-stage: install deps → `next build` → tiny runtime image. Handles the ffmpeg native binaries and Prisma client generation. |
| `.dockerignore` | Keeps junk (node_modules, `.env`, local uploads) out of the build so it's fast and doesn't leak secrets. |
| `render.yaml` | The **Blueprint**. One file that tells Render to create the database + web service + disk, all wired together. This is "infrastructure as code." |
| `.node-version` | Pins Node 22 so every build is identical. |
| `next.config.ts` | Changed: added `output: "standalone"` so the Docker image is small and self-contained. |

---

## 2. Prerequisites (install once)

1. **Git** — check with `git --version`. If missing: https://git-scm.com/download/win
2. **A GitHub account** — https://github.com (free).
3. **A Render account** — https://render.com (free, sign up with GitHub — it makes
   connecting the repo one click).

That's it. You do **not** need Docker installed locally — Render builds the image
for you in the cloud. (You *can* install Docker Desktop to test the build locally,
but it's optional.)

---

## 3. Generate the lockfile (one-time, important)

The Dockerfile uses `npm ci`, which requires a `package-lock.json`. Generate and
commit it so builds are reproducible:

```powershell
cd "d:\Departmental\Official Assignements\Achieve Management\archivo"
npm install
```

This creates/updates `package-lock.json`. Commit it in the next step.

---

## 4. Put the code on GitHub

Your `archivo/` folder isn't a git repo yet. Let's make it one and push it.

```powershell
cd "d:\Departmental\Official Assignements\Achieve Management\archivo"

git init
git add .
git commit -m "Prepare Archivo for deployment"
```

> ✅ Your `.gitignore` already excludes `node_modules`, `.next`, `.env*`, and the
> contents of `storage/`. That means **your `.env` secrets are NOT committed** —
> which is correct. We'll set those secrets directly in Render instead.

Now create the repo on GitHub:

1. Go to https://github.com/new
2. Name it `archivo` (or anything). **Set it to Private.**
3. Do **not** add a README/.gitignore/license (you already have files).
4. Click **Create repository**.
5. Copy the two commands GitHub shows under *"…or push an existing repository"*.
   They look like:

```powershell
git remote add origin https://github.com/<your-username>/archivo.git
git branch -M main
git push -u origin main
```

Refresh the GitHub page — your code is now there.

---

## 5. Deploy on Render (the free test version)

1. Go to https://dashboard.render.com → **New +** → **Blueprint**.
2. Connect your GitHub account and pick the `archivo` repo.
3. Render finds `render.yaml` and shows a preview: a **web service** + a
   **Postgres database**. Click **Apply**.

### 5a. Before the first deploy succeeds — free-tier disk note

The `render.yaml` includes a **persistent disk**, which requires a **paid**
instance plan. On the **free** plan you have two choices:

- **Simplest for a throwaway test:** open `render.yaml`, comment out the entire
  `disk:` block (the 4 lines under `disk:`), commit, and push. Uploads will then
  be *ephemeral* (lost on each redeploy) — fine for clicking around a demo.
- **Recommended even for testing:** upgrade the web service to the **Starter**
  plan (~$7/mo) so the disk works and the app doesn't sleep. This is the config
  you'll use for real anyway.

### 5b. Set the environment variables

In the Render dashboard, open your **web service → Environment**. Most vars come
from `render.yaml` automatically (`DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV`).
You need to fill in the ones marked `sync: false`:

| Variable | Value | Required? |
|----------|-------|-----------|
| `APP_URL` | Your Render URL, e.g. `https://archivo.onrender.com`. Set it **after** the first deploy, once you see the URL. Then trigger a redeploy. | Yes (email links) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Real email provider creds (SendGrid, Amazon SES, Resend…). **Leave all blank to disable email** — in-app notifications still work. | No |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Only if using the Google Drive "Open in" connector. `GOOGLE_REDIRECT_URI` must be `https://<your-app-url>/api/integrations/google/callback`. | No |

`SESSION_SECRET` is auto-generated by Render (`generateValue: true`) — you don't
set it. It stays stable across deploys, so existing logins don't break.

### 5c. First deploy runs migrations automatically

On deploy, Render runs `npx prisma migrate deploy` (the `preDeployCommand` in
`render.yaml`) **before** the app goes live. This creates all your tables in the
fresh Postgres database from `prisma/migrations/`. It's safe to run every deploy —
it only applies migrations that haven't been applied yet.

### 5d. Seed the demo data (one time only)

Your database now has tables but no data — no organization, no login. Seed it
**once** via the Render Shell:

1. Web service → **Shell** tab.
2. Run:

```bash
npm run db:seed
```

This creates the demo NGO org and the four demo users. You can now log in at
your Render URL with:

- `admin@demo-ngo.org` / `Password123!`

> ⚠️ **Change or delete these demo accounts before real use.** They have known
> public passwords. For a real customer, create a fresh org/admin and remove the
> demo one.

Your app is live. 🎉

---

## 6. The everyday workflow (after setup)

From now on, deploying a change is just:

```powershell
git add .
git commit -m "describe your change"
git push
```

Render auto-deploys every push to `main`. It rebuilds the image, runs
`prisma migrate deploy` (so new migrations apply automatically), then swaps to
the new version with zero downtime on paid plans.

**When you add a schema change:** create the migration locally first
(`npx prisma migrate dev --name your_change` against a local Postgres), commit the
new folder in `prisma/migrations/`, and push. Render applies it on deploy. Never
edit the production DB by hand.

---

## 7. Going to production (the paid plan)

When you're ready for real users, flip these in `render.yaml` (or the dashboard)
and push:

| Setting | Free (test) | Paid (production) | Why |
|---------|-------------|-------------------|-----|
| Web service `plan` | `free` (sleeps, no disk) | `starter` (~$7/mo, always-on) | Free instances sleep after 15 min idle and can't hold a disk. |
| Database `plan` | `free` (expires in 90 days) | `basic-256mb`+ (~$7/mo) | Free DB is deleted after 90 days and has no backups. |
| `disk:` block | commented out (ephemeral files) | enabled, `sizeGB` as needed | Real uploaded files must persist. **Required for production.** |
| `region` | any | closest to your users | Latency. |

Rough starting cost for production: **~$14/mo** (Starter web + Basic DB) plus
disk storage (~$0.25/GB/mo). You can scale each independently later.

**Production checklist:**
- [ ] Web service on `starter` (or higher), disk enabled.
- [ ] Database on a paid plan (automated daily backups turned on).
- [ ] Demo users deleted; a real admin account created.
- [ ] `APP_URL` set to your real domain.
- [ ] A custom domain added (Render → Settings → Custom Domains; free HTTPS).
- [ ] Email configured (`SMTP_*`) if you want notification emails.
- [ ] The app's own backup job scheduled: Render → **Cron Jobs** → run
      `npm run backup` daily (your app already has this script — see the backups
      section in `CLAUDE.md`). This complements the DB provider's backups by also
      snapshotting the uploaded files on the disk.

---

## 8. Troubleshooting

**Build fails on `npm ci`** → you forgot to commit `package-lock.json`. Run
`npm install` locally, `git add package-lock.json`, commit, push.

**App starts but every page errors with a DB/connection error** → `DATABASE_URL`
isn't set, or migrations didn't run. Check the web service → **Logs**, confirm
`prisma migrate deploy` succeeded in the deploy log. Render Postgres requires SSL;
the injected `connectionString` already includes it.

**Can't log in / "no organization"** → you haven't seeded. Run `npm run db:seed`
in the Render Shell (step 5d). It only needs to run once.

**Uploaded files disappear after a deploy** → you're on the free plan with no
disk, or the `disk:` block is commented out. Enable the disk (paid plan required)
so `/app/storage` persists.

**Video thumbnails don't generate** → the ffmpeg binaries didn't make it into the
image. The Dockerfile copies `ffmpeg-static`/`ffprobe-static` explicitly for
exactly this reason; check the runtime logs for a spawn/ENOENT error and confirm
those `COPY` lines are present.

**First request after idle is slow (~30s)** → that's the free plan cold-starting
a sleeping instance. Upgrade to `starter` to stay always-on.

**Emails aren't sending** → expected if `SMTP_HOST` is unset (email is disabled
by design; in-app notifications still work). Set the `SMTP_*` vars to enable.

---

## Quick reference: the whole flow

```
1.  npm install                 # generate package-lock.json (once)
2.  git init && git add . && git commit -m "..."   # (once)
3.  push to GitHub              # (once, then just `git push` after)
4.  Render → New → Blueprint → pick repo → Apply
5.  Fill sync:false env vars (APP_URL after 1st deploy)
6.  Render Shell: npm run db:seed   # (once)
7.  Log in at your Render URL
—— everyday: git push → Render auto-deploys ——
—— production: bump plans to paid, enable disk, delete demo users ——
```
