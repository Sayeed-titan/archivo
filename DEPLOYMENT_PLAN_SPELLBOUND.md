# Deployment Plan — Archivo for Spellbound (DCCI project, 2-VM split)

This plan covers a **production** deployment split across two VMs, sharing the
existing DCCI Postgres host rather than standing up a new database server.
It is a variant of the two paths already in this repo
([`DEPLOYMENT.md`](./DEPLOYMENT.md) = Render, [`DEPLOYMENT_OPTIONS.md`](./DEPLOYMENT_OPTIONS.md)
§3 = single-box IIS + local Postgres) — this document is the one to follow
when the database and the app live on **separate, already-provisioned VMs**.

| | |
|---|---|
| **Client** | Spellbound |
| **Project** | DCCI |
| **VM1** | Linux — PostgreSQL (existing shared host, already running the `dcci` database) |
| **VM2** | Windows — Next.js app (backend + frontend), served via IIS |

---

## 0. Decisions this plan is built on

These were confirmed before writing this plan — if any changes, the affected
section below must change with it:

| Decision | Choice |
|---|---|
| New database name | **`archivo`** (a dedicated database, not reusing `dcci`) |
| Schema name inside it | **`spellbound`** |
| Postgres login | **Reuse `mkl_25`** (the same role already used for the `dcci` database) — see the residual-risk note in [§5](#5-security-checklist) |
| VM2 reachability | **Both**: a public IP for direct/infra access, and a domain name with real TLS for end-user/browser access |

Existing DCCI connection info for reference (unchanged, not part of this plan):
```
Host=180.94.20.106;Port=5432;Database=dcci;Username=mkl_25;Password=dcci@#2030$dc$;Search Path=mediklaud_dcci
```

Placeholders used below that **you must fill in** before executing:

| Placeholder | What it is |
|---|---|
| `<VM2_PUBLIC_IP>` | VM2's public/static IP address |
| `<DOMAIN_NAME>` | The domain Spellbound will use, e.g. `archivo.spellbound.example.com` |
| `<VM1_SSH_USER>` | Your sudo-capable SSH login on VM1 |

---

## 1. Architecture

```
                         Internet
                            │
              ┌─────────────┴─────────────┐
              │  DNS: <DOMAIN_NAME> → <VM2_PUBLIC_IP>
              ▼                            
   ┌────────────────────────────┐          Firewall: only <VM2_PUBLIC_IP>
   │ VM2 — Windows               │          allowed to reach 5432 on VM1
   │  IIS (reverse proxy, :443) │──────┐
   │   └─ ARR → localhost:3000  │      │
   │  Node.js 22.20.0 (NSSM svc)│      │  hostssl, sslmode=require
   │   └─ Next.js standalone    │      ▼
   │  Local disk:                │  ┌──────────────────────────────┐
   │   storage/uploads/          │  │ VM1 — Linux                   │
   │   storage/avatars/          │  │  PostgreSQL (existing cluster)│
   │   backups/                  │  │   database: dcci   (existing) │
   └────────────────────────────┘  │   database: archivo (new)     │
                                    │     schema: spellbound        │
                                    │     role:   mkl_25 (shared)   │
                                    └──────────────────────────────┘
```

Two things this project **requires** and both VMs must satisfy (see
`DEPLOYMENT_OPTIONS.md` §0 for why): a persistent disk for uploads (VM2, local
disk — not on VM1, Postgres never stores files), and a long-running Node
process (VM2, via NSSM — not IIS/iisnode directly, for the same ffmpeg/large-
upload reasons already documented in this repo).

---

## 2. VM1 — PostgreSQL (Linux)

VM1 already runs the Postgres cluster serving `dcci`. Nothing about that
cluster needs reinstalling — you're adding a database, not a server.

### 2a. Create the database, schema, and grants

SSH into VM1 and connect as a superuser (`postgres` or an admin role):

```bash
ssh <VM1_SSH_USER>@180.94.20.106
sudo -u postgres psql
```

```sql
-- New, isolated database for this project (separate from dcci's tables/backups)
CREATE DATABASE archivo OWNER mkl_25;

\c archivo

-- Client-named schema inside it
CREATE SCHEMA IF NOT EXISTS spellbound AUTHORIZATION mkl_25;

-- Make "spellbound" the default schema whenever mkl_25 connects to *this*
-- database specifically (dcci's search_path of mediklaud_dcci is untouched).
ALTER ROLE mkl_25 IN DATABASE archivo SET search_path TO spellbound;

GRANT ALL PRIVILEGES ON DATABASE archivo TO mkl_25;
GRANT ALL PRIVILEGES ON SCHEMA spellbound TO mkl_25;
ALTER DEFAULT PRIVILEGES IN SCHEMA spellbound GRANT ALL ON TABLES TO mkl_25;
```

> Why a real schema and not just `public`: this Postgres cluster already hosts
> other clients' data. A named schema keeps `\dt`, backups, and any future
> per-client restore all scoped to `spellbound` instead of an undifferentiated
> `public`.

> Note on Prisma: `prisma/schema.prisma` in this repo does **not** use the
> `multiSchema` preview feature — it's single-schema. That's fine here: adding
> `?schema=spellbound` to the connection string (see §3b) tells Postgres to
> treat `spellbound` as the connection's default schema, so every unqualified
> `CREATE TABLE...` from `prisma migrate deploy` lands there. No code changes
> needed. This only works because the schema already exists from the SQL
> above — Prisma will not create the schema itself.

### 2b. Restrict network access to VM2 only

Find and edit `pg_hba.conf` (commonly `/etc/postgresql/<version>/main/pg_hba.conf`
on Debian/Ubuntu, or `/var/lib/pgsql/<version>/data/pg_hba.conf` on RHEL/Rocky).
Add a line **above** any broader/catch-all rule, scoped to VM2's IP and this
one database:

```
# Archivo (Spellbound) — VM2 only, TLS required
hostssl archivo    mkl_25    <VM2_PUBLIC_IP>/32    scram-sha-256
```

Confirm `postgresql.conf` already has `listen_addresses` including this
server's IP (it must, since `dcci` is already reached remotely from
elsewhere) and that `ssl = on`.

Reload (does not drop existing connections):

```bash
sudo systemctl reload postgresql        # Debian/Ubuntu naming may be postgresql@<ver>-main
```

### 2c. Firewall — allow 5432 from VM2's IP only

Debian/Ubuntu (`ufw`):
```bash
sudo ufw allow from <VM2_PUBLIC_IP> to any port 5432 proto tcp
```

RHEL/Rocky (`firewalld`):
```bash
sudo firewall-cmd --permanent --zone=public --add-rich-rule='rule family="ipv4" source address="<VM2_PUBLIC_IP>/32" port protocol="tcp" port="5432" accept'
sudo firewall-cmd --reload
```

Do **not** open 5432 to `0.0.0.0/0` — the DCCI host is shared infrastructure;
only VM2 should ever reach Postgres directly.

### 2d. Backups (VM1 side — the database itself)

Add a daily `pg_dump` cron job scoped to just this database, separate from
however `dcci` is already backed up:

```bash
crontab -e
```
```cron
0 2 * * * pg_dump -Fc -U mkl_25 -h localhost archivo > /var/backups/archivo/archivo_$(date +\%F).dump
```
Keep a rotation (e.g. `find /var/backups/archivo -mtime +14 -delete`) and copy
dumps off-host periodically — a local-disk-only backup doesn't survive a VM1
disk failure.

### 2e. Verify from VM1 before touching VM2

```bash
psql "postgresql://mkl_25:<password>@localhost:5432/archivo?options=--search_path=spellbound" -c "\dn"
```
Should list `spellbound` in the schema list.

---

## 3. VM2 — Windows Server + IIS (Next.js app)

### 3a. Prerequisites (install once)

1. **Node.js 22.20.0** (matches `.node-version`) — from nodejs.org, or via
   `nvm-windows` if you'll ever need to switch versions.
2. **IIS** — Server Manager → Add Roles and Features → Web Server (IIS).
3. **URL Rewrite** module (IIS.net) and **Application Request Routing (ARR)**
   (IIS.net) — after installing ARR, IIS Manager → server node →
   *Application Request Routing Cache* → *Server Proxy Settings* → check
   **Enable proxy**.
4. **NSSM** (nssm.cc) — runs the Node process as a real Windows Service so it
   survives reboots and restarts on crash.
5. **Git** (to pull the repo) or another way to copy the code onto VM2.

### 3b. Get the code onto VM2 and configure it

```powershell
cd C:\apps
git clone <your-repo-url> archivo
cd archivo
npm install
```

Build the Prisma connection string. The DCCI-style password contains
characters (`@ # $`) that a URI connection string treats as delimiters, so
they must be percent-encoded: `@`→`%40`, `#`→`%23`, `$`→`%24`. Using the
password given for `mkl_25` (**verify this is still correct** before use —
don't assume it's unchanged):

```
postgresql://mkl_25:dcci%40%232030%24dc%24@180.94.20.106:5432/archivo?schema=spellbound&sslmode=require
```

Set production env vars. **Do not** rely on a committed `.env` for the
running service — NSSM services don't read `.env` files automatically (see
§3f). Use `.env` only for local `prisma generate`/one-off CLI commands run
directly on VM2:

```
DATABASE_URL="postgresql://mkl_25:dcci%40%232030%24dc%24@180.94.20.106:5432/archivo?schema=spellbound&sslmode=require"
APP_URL="https://<DOMAIN_NAME>"
SESSION_SECRET="<generate with e.g. openssl rand -base64 32 — new value, not shared with any other deployment>"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="https://<DOMAIN_NAME>/api/integrations/google/callback"
SMTP_HOST="..."
SMTP_PORT="..."
SMTP_SECURE="..."
SMTP_USER="..."
SMTP_PASS="..."
SMTP_FROM="Archivo <notifications@<DOMAIN_NAME>>"
```

> `GOOGLE_REDIRECT_URI` must be registered in Google Cloud Console exactly
> matching the domain — Google OAuth will reject the bare public IP as a
> redirect target, so the Google connector only works once the domain +
> HTTPS are live (§3g).

### 3c. Apply migrations and seed

```powershell
npx prisma generate
npx prisma migrate deploy
npm run db:seed    # once only — creates demo org/users; replace before real client use
```

`prisma migrate deploy` needs `DATABASE_URL` set in the shell environment
(or `.env`) at the time you run it — this is a one-off CLI run, separate from
how the running app gets its env vars (§3f).

### 3d. Build for production

```powershell
npm run build
```

Finish the standalone bundle by hand (things `output: "standalone"` doesn't
auto-copy — same steps as `DEPLOYMENT_OPTIONS.md` §3 Part B):
- Copy `.next/static/` → `.next/standalone/.next/static/`
- Copy `public/` → `.next/standalone/public/`
- Verify `.next/standalone/node_modules/ffmpeg-static` and `ffprobe-static`
  contain the actual binaries, not just `package.json` — copy them in from
  the top-level `node_modules/` if missing.
- Create `storage/uploads/` and `storage/avatars/` under `.next/standalone/`
  — this is VM2's **local disk**; uploaded files never touch VM1.

### 3e. Run as a Windows Service (NSSM)

```powershell
nssm install Archivo
```
In the GUI:
- **Path**: your `node.exe`
- **Startup directory**: `C:\apps\archivo\.next\standalone`
- **Arguments**: `server.js`
- **Environment** tab: paste in every var from §3b (`PORT=3000` plus all of
  them) — NSSM does not read `.env`.
- **Startup type**: Automatic

```powershell
nssm start Archivo
```
Confirm `http://localhost:3000` responds on VM2 before touching IIS.

### 3f. IIS — site, bindings, and reverse proxy

Create the site:
```
IIS Manager → Sites → Add Website
  Name: Archivo (Spellbound)
  Physical path: any empty folder, e.g. C:\inetpub\archivo-proxy
```

Add **both** access paths as bindings on the same site:

| Binding | IP | Port | Host name | Purpose |
|---|---|---|---|---|
| HTTP | `<VM2_PUBLIC_IP>` | 80 | *(blank)* | Redirect to HTTPS; also useful for plain connectivity checks |
| HTTPS | `<VM2_PUBLIC_IP>` | 443 | `<DOMAIN_NAME>` | Real client traffic — SNI cert bound here |

Get a real certificate for `<DOMAIN_NAME>` — either **win-acme** (free,
Let's Encrypt, auto-renewing) or a purchased cert imported into the Windows
certificate store, then bound to the 443 binding above.

> A trusted public CA will not issue a certificate for a bare IP address.
> Treat the IP binding as HTTP-only, for infra/firewall verification and
> health checks — not for end-user browser access. Real users always go
> through `https://<DOMAIN_NAME>`. This also matters for session cookies and
> the Google OAuth redirect, which are pinned to the domain.

`web.config` in the site's physical path (reverse proxy to the Node
process — identical pattern to `DEPLOYMENT_OPTIONS.md` §3 Part D):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="HTTPtoHTTPS" stopProcessing="true">
          <match url="(.*)" />
          <conditions>
            <add input="{HTTPS}" pattern="^OFF$" />
          </conditions>
          <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
        </rule>
        <rule name="ReverseProxyToNode" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://localhost:3000/{R:1}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

### 3g. DNS and firewall

- DNS: create an **A record** for `<DOMAIN_NAME>` → `<VM2_PUBLIC_IP>`.
- Windows Defender Firewall (VM2): allow inbound TCP 80 and 443 from Any;
  restrict RDP (3389) to your management IPs only — VM2 is now
  internet-facing, RDP should not be.
- Any cloud/perimeter security group in front of VM2 needs the matching
  80/443 inbound rules opened.

### 3h. Verify

1. `http://<VM2_PUBLIC_IP>` and `https://<DOMAIN_NAME>` both load the app.
2. Log in, upload a file, `nssm restart Archivo`, confirm the file is still
   downloadable — proof the disk persists across restarts.
3. Confirm the Google "open in" connector (if used) round-trips through
   `https://<DOMAIN_NAME>/api/integrations/google/callback`.

---

## 4. Cross-VM connectivity checklist

Run these from VM2 before assuming anything upstream in §3 will work:

```powershell
Test-NetConnection -ComputerName 180.94.20.106 -Port 5432
```
Expect `TcpTestSucceeded : True`. If it fails: check §2b/§2c on VM1 first
(pg_hba.conf entry present? firewall rule present? both scoped to VM2's
actual outbound IP, which may differ from a private IP if VM2 is behind NAT).

---

## 5. Security checklist

- [ ] `pg_hba.conf` rule scoped to `<VM2_PUBLIC_IP>/32` only, `hostssl` (TLS
      required), not a broad `0.0.0.0/0` rule.
- [ ] Firewall on VM1 allows 5432 from `<VM2_PUBLIC_IP>` only.
- [ ] `DATABASE_URL` on VM2 uses `sslmode=require`.
- [ ] **Residual risk, accepted by choice**: `mkl_25` is shared between the
      `dcci` and `archivo` databases. A compromise of either app's
      credentials gives access to both databases on this host — there is no
      privilege separation between the two projects at the database-role
      level. If that ever needs tightening, revisit with a dedicated role
      (`GRANT` scoped to just `archivo`/`spellbound`) — no schema/data
      changes required, only a new role + updated `DATABASE_URL`.
- [ ] `SESSION_SECRET` on VM2 is freshly generated, not reused from any other
      deployment of this app.
- [ ] RDP on VM2 restricted to management IPs; only 80/443 open to the
      internet.
- [ ] TLS certificate on `<DOMAIN_NAME>` valid and auto-renewing (win-acme
      task scheduled, or renewal reminder if using a purchased cert).
- [ ] Demo seed users (`admin@demo-ngo.org` etc.) deleted before Spellbound's
      real users start using the system.
- [ ] Secrets (`DATABASE_URL`, `SESSION_SECRET`, SMTP/Google creds) live only
      in the NSSM service's Environment tab — never committed to git.

---

## 6. Ongoing operations

**Deploying an update** (no auto-deploy pipeline in this topology — it's
manual, unlike the Render path):
```powershell
git pull
npm install
npx prisma migrate deploy   # only if new migrations were added
npm run build
# redo the standalone-bundle copy steps in §3d if node_modules/public changed
nssm restart Archivo
```

**Backups**:
- Database (VM1): the `pg_dump` cron job from §2d.
- Uploaded files + app-level backup (VM2): schedule `npm run backup` via
  Windows Task Scheduler (same script `DEPLOYMENT.md` §7 references for the
  Render path — it already exists in this repo).

**Monitoring**: NSSM restarts the process on crash by default (configurable
in the service's *Exit actions* tab). Check `.next/standalone` for app logs;
check IIS logs (`%SystemDrive%\inetpub\logs\LogFiles`) for proxy-layer
errors (502s here usually mean the Node process/service is down — check
`nssm status Archivo` first).

---

## 7. Rollback

- **App-only issue** (bad deploy): `git checkout <previous-commit>`, rebuild
  (§3d), `nssm restart Archivo`. No database change involved unless a
  migration shipped with it.
- **Migration went out with the bad deploy**: do not hand-edit the database.
  Restore the `archivo` database from the most recent `pg_dump` in §2d, then
  redeploy the previous app version.
- **VM2 total failure**: files in `storage/uploads/`/`storage/avatars/` only
  exist on VM2's local disk — if backups per §6 weren't running, they are
  unrecoverable. This is the concrete reason the backup job isn't optional.

---

## 8. Open items to fill in before executing this plan

- [ ] `<VM2_PUBLIC_IP>` — VM2's actual public IP
- [ ] `<DOMAIN_NAME>` — the domain Spellbound will use, and who registers the
      DNS A record
- [ ] `<VM1_SSH_USER>` — sudo login for VM1
- [ ] Confirm VM1's Linux distro (Debian/Ubuntu vs RHEL/Rocky) — changes the
      exact `pg_hba.conf` path and firewall command family in §2b/§2c
- [ ] Confirm the `mkl_25` password shown in this plan is still current
- [ ] TLS certificate source for `<DOMAIN_NAME>` (win-acme/Let's Encrypt vs.
      a purchased cert)
- [ ] SMTP provider credentials, if email notifications are wanted
- [ ] Google OAuth client, if the "open in Google Drive" connector is wanted
      for Spellbound
