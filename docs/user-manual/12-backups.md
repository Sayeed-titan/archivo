[← Manual home](README.md)

# Backups

Unlike every other page in this manual, backups aren't run from inside the
app — there's no "Back up now" button. This page is for whoever administers
the server hosting Archivo, not day-to-day users.

## What you see in the app

Administrators (`canManageSettings`) see a status banner at the top of the
[Dashboard](02-dashboard.md) — green when the last backup is under 24 hours
old, red "overdue" once it's older than that (matching a 24-hour recovery
point target):

> "Last backup: 7/2/2026, 1:50:43 AM (371.4h ago) — overdue (RPO target: 24h)"

This banner only reflects whether backups are actually being run — it
doesn't trigger one.

## Running a backup

From the server, in the `archivo/` project folder:

```
npm run backup
```

This exports every database table to JSON (one file per table) plus a copy
of all uploaded files, into a timestamped folder under `backups/`, with a
`manifest.json` recording row counts, duration, and file count. Backups
older than the retention window (`BACKUP_RETENTION_DAYS` environment
variable, default 30 days) are pruned automatically on each run.

## Restoring

```
npm run backup:restore -- <backup-folder>
```

Reverses the process against a fresh/empty database — intended for disaster
recovery, not for reconciling a backup against a database that already has
live data in it.

## Scheduling

Nothing runs automatically — `npm run backup` only does something when
invoked. Point your platform's scheduler at it:

- **Linux/macOS (cron)**:
  ```
  0 2 * * * cd /path/to/archivo && npm run backup >> /var/log/archivo-backup.log 2>&1
  ```
  (daily at 2am)
- **Windows (Task Scheduler)**: create a Basic Task, daily trigger, action =
  `npm.cmd`, arguments = `run backup`, start-in = the project directory.
- **Managed hosting** (Vercel, etc.): use the platform's Cron Jobs feature
  to hit a protected route that runs the same logic, or run it as a
  separate scheduled job/container against the same database — the app
  server itself does not run background cron jobs.

Once a schedule is in place, the dashboard banner should stay green as long
as it keeps running successfully.
