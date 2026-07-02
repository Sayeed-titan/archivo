import "server-only";
import { readdir, readFile } from "fs/promises";
import path from "path";

const BACKUP_ROOT = path.join(process.cwd(), "backups");

export type BackupManifest = {
  createdAt: string;
  durationMs: number;
  tableCounts: Record<string, number>;
  storedFileCount: number;
};

export type BackupStatus = {
  lastBackup: BackupManifest | null;
  hoursSinceLastBackup: number | null;
  isOverdue: boolean; // SRS.md NFR-5: RPO <= 24h
};

// Reads whichever backup directory (named by ISO timestamp) sorts last —
// scripts/backup/run-backup.ts is the only writer, run out-of-band via
// `npm run backup` on a schedule (see CLAUDE.md for cron/Task Scheduler
// setup). This just reports what it finds; it does not trigger backups.
export async function getBackupStatus(): Promise<BackupStatus> {
  let entries: string[];
  try {
    entries = await readdir(BACKUP_ROOT);
  } catch {
    return { lastBackup: null, hoursSinceLastBackup: null, isOverdue: true };
  }

  const backupDirs = entries.filter((e) => e !== ".gitkeep").sort().reverse();
  if (backupDirs.length === 0) {
    return { lastBackup: null, hoursSinceLastBackup: null, isOverdue: true };
  }

  try {
    const manifestRaw = await readFile(path.join(BACKUP_ROOT, backupDirs[0], "manifest.json"), "utf-8");
    const manifest = JSON.parse(manifestRaw) as BackupManifest;
    const hoursSince = (Date.now() - new Date(manifest.createdAt).getTime()) / (1000 * 60 * 60);

    return {
      lastBackup: manifest,
      hoursSinceLastBackup: hoursSince,
      isOverdue: hoursSince > 24,
    };
  } catch {
    return { lastBackup: null, hoursSinceLastBackup: null, isOverdue: true };
  }
}
