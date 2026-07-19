import "dotenv/config";
import { mkdir, writeFile, readdir, rm, stat } from "fs/promises";
import path from "path";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { BACKUP_MODEL_ORDER } from "./models";

// See src/lib/prisma.ts for why DATABASE_SCHEMA must be passed explicitly —
// @prisma/adapter-pg does not read `?schema=` out of DATABASE_URL.
const adapter = new PrismaPg(
  { connectionString: process.env.DATABASE_URL },
  process.env.DATABASE_SCHEMA ? { schema: process.env.DATABASE_SCHEMA } : undefined,
);
const prisma = new PrismaClient({ adapter });

const BACKUP_ROOT = path.join(process.cwd(), "backups");
const STORAGE_ROOT = path.join(process.cwd(), "storage", "uploads");
const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS ?? 30);

// SRS.md NFR-5: automated daily backups, RPO <= 24h. This exports every
// table to JSON (portable — works against any Postgres including the
// WASM `prisma dev` instance used for local dev, no pg_dump binary
// required) plus a tarball of the uploaded-file storage directory. See
// run-restore.ts for the matching import path.
function jsonReplacer(_key: string, value: unknown) {
  if (typeof value === "bigint") return { __bigint__: value.toString() };
  return value;
}

async function backupDatabase(targetDir: string) {
  const counts: Record<string, number> = {};

  for (const modelName of BACKUP_MODEL_ORDER) {
    const delegate = (prisma as unknown as Record<string, { findMany: () => Promise<unknown[]> }>)[modelName];
    const rows = await delegate.findMany();
    counts[modelName] = rows.length;
    await writeFile(path.join(targetDir, `${modelName}.json`), JSON.stringify(rows, jsonReplacer, 2));
  }

  return counts;
}

async function backupFileStorage(targetDir: string) {
  let fileCount = 0;
  try {
    const entries = await readdir(STORAGE_ROOT);
    const storageBackupDir = path.join(targetDir, "storage");
    await mkdir(storageBackupDir, { recursive: true });
    for (const entry of entries) {
      if (entry === ".gitkeep") continue;
      const { copyFile } = await import("fs/promises");
      await copyFile(path.join(STORAGE_ROOT, entry), path.join(storageBackupDir, entry));
      fileCount += 1;
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  return fileCount;
}

async function pruneOldBackups() {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let pruned = 0;

  let entries: string[];
  try {
    entries = await readdir(BACKUP_ROOT);
  } catch {
    return pruned;
  }

  for (const entry of entries) {
    const entryPath = path.join(BACKUP_ROOT, entry);
    const info = await stat(entryPath);
    if (info.isDirectory() && info.mtimeMs < cutoff) {
      await rm(entryPath, { recursive: true, force: true });
      pruned += 1;
    }
  }

  return pruned;
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const targetDir = path.join(BACKUP_ROOT, timestamp);
  await mkdir(targetDir, { recursive: true });

  const startedAt = Date.now();
  const counts = await backupDatabase(targetDir);
  const fileCount = await backupFileStorage(targetDir);
  const durationMs = Date.now() - startedAt;

  const manifest = {
    createdAt: new Date().toISOString(),
    durationMs,
    tableCounts: counts,
    storedFileCount: fileCount,
  };
  await writeFile(path.join(targetDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  const pruned = await pruneOldBackups();

  console.log(`Backup written to ${targetDir}`);
  console.log(`Tables: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  console.log(`Files backed up: ${fileCount}`);
  console.log(`Duration: ${durationMs}ms`);
  if (pruned > 0) console.log(`Pruned ${pruned} backup(s) older than ${RETENTION_DAYS} days`);
}

main()
  .catch((e) => {
    console.error("Backup failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
