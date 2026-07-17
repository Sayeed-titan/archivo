import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { resetTestDb } from "../setup/reset-test-db";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile, STORAGE_ROOT } from "@/lib/file-storage";
import type { User } from "@/generated/prisma/client";

function makeFile(name: string, contents: string) {
  return new File([contents], name, { type: "text/plain" });
}

describe("saveUploadedFile — versioning (SRS FR-4.4)", () => {
  let admin: User;
  let folderId: string;
  const writtenStoragePaths: string[] = [];

  beforeAll(async () => {
    await resetTestDb();
    const org = await prisma.organization.findUniqueOrThrow({ where: { slug: "demo-ngo" } });
    admin = await prisma.user.findFirstOrThrow({ where: { organizationId: org.id, email: "admin@demo-ngo.org" } });
    const archive = await prisma.archive.create({
      data: {
        organizationId: org.id,
        archiveNumber: "ARC-TEST-VERSIONING",
        name: "Versioning test archive",
        status: "Draft",
        createdById: admin.id,
        folders: { create: [{ name: "Documents", order: 0 }] },
      },
      include: { folders: true },
    });
    folderId = archive.folders[0].id;
  }, 60_000);

  afterAll(async () => {
    // saveUploadedFile writes real bytes to storage/uploads/ (there's no
    // separate test storage root) — clean up what this test created so
    // repeated runs don't accumulate files there.
    await Promise.all(writtenStoragePaths.map((p) => rm(p, { force: true })));
  });

  it("first upload creates version 1, flagged isLatest", async () => {
    const file = makeFile("report.txt", "version one contents");
    const saved = await saveUploadedFile(folderId, file, admin);
    writtenStoragePaths.push(path.join(STORAGE_ROOT, saved.storagePath));

    expect(saved.version).toBe(1);
    expect(saved.isLatest).toBe(true);
    expect(saved.previousVersionId).toBeNull();

    const onDisk = await readFile(path.join(STORAGE_ROOT, saved.storagePath), "utf-8");
    expect(onDisk).toBe("version one contents");
  });

  it("re-uploading the same resolved filename creates version 2, does not delete version 1", async () => {
    const first = await prisma.file.findFirstOrThrow({ where: { folderId, filename: "report.txt" } });

    const file = makeFile("report.txt", "version two contents");
    const saved = await saveUploadedFile(folderId, file, admin);
    writtenStoragePaths.push(path.join(STORAGE_ROOT, saved.storagePath));

    expect(saved.version).toBe(2);
    expect(saved.isLatest).toBe(true);
    expect(saved.previousVersionId).toBe(first.id);

    // The old row must still exist, un-deleted, just no longer "latest" —
    // this is the whole point: nothing is overwritten in place.
    const oldRow = await prisma.file.findUniqueOrThrow({ where: { id: first.id } });
    expect(oldRow.isLatest).toBe(false);
    expect(oldRow.deletedAt).toBeNull();

    // Version 1's actual bytes on disk are untouched — versioning never
    // rewrites a previous version's stored file.
    const v1Contents = await readFile(path.join(STORAGE_ROOT, oldRow.storagePath), "utf-8");
    expect(v1Contents).toBe("version one contents");
  });

  it("a different filename in the same folder is a new file, not a new version", async () => {
    const file = makeFile("other-report.txt", "unrelated file");
    const saved = await saveUploadedFile(folderId, file, admin);
    writtenStoragePaths.push(path.join(STORAGE_ROOT, saved.storagePath));

    expect(saved.version).toBe(1);
    expect(saved.previousVersionId).toBeNull();

    const filesInFolder = await prisma.file.count({ where: { folderId, isLatest: true, deletedAt: null } });
    // report.txt (latest = v2) + other-report.txt = 2 latest files.
    expect(filesInFolder).toBe(2);
  });
});
