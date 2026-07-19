import "dotenv/config";
import { readFile, readdir, copyFile, mkdir } from "fs/promises";
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

const STORAGE_ROOT = path.join(process.cwd(), "storage", "uploads");

// Restores a backup produced by run-backup.ts into the CURRENT
// DATABASE_URL. Intended for disaster recovery (RTO <= 8h per NFR-5) —
// point DATABASE_URL at a fresh/empty database before running this, it
// does not attempt to reconcile against existing data.
function jsonReviver(_key: string, value: unknown) {
  if (value && typeof value === "object" && "__bigint__" in (value as Record<string, unknown>)) {
    return BigInt((value as { __bigint__: string }).__bigint__);
  }
  return value;
}

async function restoreDatabase(sourceDir: string) {
  const counts: Record<string, number> = {};

  for (const modelName of BACKUP_MODEL_ORDER) {
    const filePath = path.join(sourceDir, `${modelName}.json`);
    const raw = await readFile(filePath, "utf-8");
    const rows = JSON.parse(raw, jsonReviver) as Record<string, unknown>[];

    const delegate = (prisma as unknown as Record<string, { createMany: (args: { data: unknown[]; skipDuplicates: boolean }) => Promise<{ count: number }> }>)[modelName];
    if (rows.length > 0) {
      const result = await delegate.createMany({ data: rows, skipDuplicates: true });
      counts[modelName] = result.count;
    } else {
      counts[modelName] = 0;
    }
  }

  return counts;
}

async function restoreFileStorage(sourceDir: string) {
  const storageBackupDir = path.join(sourceDir, "storage");
  let fileCount = 0;
  try {
    const entries = await readdir(storageBackupDir);
    await mkdir(STORAGE_ROOT, { recursive: true });
    for (const entry of entries) {
      await copyFile(path.join(storageBackupDir, entry), path.join(STORAGE_ROOT, entry));
      fileCount += 1;
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  return fileCount;
}

async function main() {
  const backupDirArg = process.argv[2];
  if (!backupDirArg) {
    console.error("Usage: tsx scripts/backup/run-restore.ts <backup-directory>");
    process.exit(1);
  }

  const sourceDir = path.isAbsolute(backupDirArg) ? backupDirArg : path.join(process.cwd(), backupDirArg);

  const manifestRaw = await readFile(path.join(sourceDir, "manifest.json"), "utf-8");
  const manifest = JSON.parse(manifestRaw);
  console.log(`Restoring backup from ${manifest.createdAt} (${sourceDir})`);

  const counts = await restoreDatabase(sourceDir);
  const fileCount = await restoreFileStorage(sourceDir);

  console.log(`Restored rows: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  console.log(`Restored files: ${fileCount}`);
}

main()
  .catch((e) => {
    console.error("Restore failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
