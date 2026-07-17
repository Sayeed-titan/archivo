import { describe, it, expect, beforeAll } from "vitest";
import { resetTestDb } from "../setup/reset-test-db";
import { prisma } from "@/lib/prisma";
import { searchArchives } from "@/lib/search-archives";
import type { Role, User } from "@/generated/prisma/client";

type UserWithRole = User & { role: Role };

// The core architectural bet of the whole product: every table is scoped by
// organizationId, and a user must never see another organization's data no
// matter what role they hold. This seeds two *separate* organizations (not
// just two users in the seeded demo org) and proves searchArchives — the
// code path every archive-browsing screen goes through — can't cross the
// boundary even for a role with full "view all" rights.
describe("multi-tenant isolation via searchArchives", () => {
  let orgAAdmin: UserWithRole;
  let orgBAdmin: UserWithRole;
  let orgAFileName: string;
  let orgBFileName: string;

  beforeAll(async () => {
    await resetTestDb();
    const suffix = Date.now();

    async function makeOrgWithArchive(label: string) {
      const org = await prisma.organization.create({
        data: { name: `${label} Org`, slug: `${label.toLowerCase()}-${suffix}`, industry: "test" },
      });
      const role = await prisma.role.create({
        data: {
          organizationId: org.id,
          name: "Administrator",
          canCreateArchive: true,
          canUpload: true,
          canEditMetadata: true,
          canDeleteArchive: true,
          canHardDelete: true,
          canManageUsers: true,
          canManageSettings: true,
          canGenerateReport: true,
          canViewAll: true, // deliberately unrestricted — isolation must hold anyway
          canDownload: true,
        },
      });
      const user = await prisma.user.create({
        data: {
          organizationId: org.id,
          email: `admin@${label.toLowerCase()}-${suffix}.test`,
          passwordHash: "not-a-real-hash",
          name: `${label} Admin`,
          roleId: role.id,
        },
        include: { role: true },
      });

      const fileName = `${label}-unique-secret-document-${suffix}.pdf`;
      const archive = await prisma.archive.create({
        data: {
          organizationId: org.id,
          archiveNumber: "ARC-TEST-00001",
          name: `${label} Confidential Archive`,
          status: "Draft",
          createdById: user.id,
          folders: {
            create: [
              {
                name: "Documents",
                order: 0,
                files: {
                  create: [
                    {
                      filename: fileName,
                      fileType: "pdf",
                      mimeType: "application/pdf",
                      sizeBytes: 10,
                      storagePath: "test-only",
                      uploadedById: user.id,
                    },
                  ],
                },
              },
            ],
          },
        },
      });

      return { user, fileName, archive };
    }

    const a = await makeOrgWithArchive("OrgA");
    const b = await makeOrgWithArchive("OrgB");

    orgAAdmin = a.user;
    orgBAdmin = b.user;
    orgAFileName = a.fileName;
    orgBFileName = b.fileName;
  }, 60_000);

  it("an org-A admin's search never returns an org-B file, even with canViewAll", async () => {
    const results = await searchArchives(orgAAdmin, {});
    const filenames = results.map((f) => f.filename);

    expect(filenames).toContain(orgAFileName);
    expect(filenames).not.toContain(orgBFileName);
    expect(results.every((f) => f.folder.archive.organizationId === orgAAdmin.organizationId)).toBe(true);
  });

  it("an org-B admin's search never returns an org-A file", async () => {
    const results = await searchArchives(orgBAdmin, {});
    const filenames = results.map((f) => f.filename);

    expect(filenames).toContain(orgBFileName);
    expect(filenames).not.toContain(orgAFileName);
  });

  it("a free-text query matching another org's archive name still returns nothing across the boundary", async () => {
    // Confirms the isolation is enforced as a hard AND on organizationId,
    // not just something that happens to work when no query is given.
    const results = await searchArchives(orgAAdmin, { q: "OrgB Confidential" });
    expect(results).toEqual([]);
  });
});

describe("department-scoped visibility within one organization", () => {
  let deptUserPrograms: UserWithRole;
  let programsArchiveName: string;
  let financeArchiveName: string;

  beforeAll(async () => {
    await resetTestDb();
    const org = await prisma.organization.findUniqueOrThrow({ where: { slug: "demo-ngo" } });
    const deptUser = await prisma.user.findFirstOrThrow({
      where: { organizationId: org.id, email: "deptuser@demo-ngo.org" },
      include: { role: true },
    });
    deptUserPrograms = deptUser;

    const suffix = Date.now();
    programsArchiveName = `Programs-only archive ${suffix}`;
    financeArchiveName = `Finance-only archive ${suffix}`;

    await prisma.archive.create({
      data: {
        organizationId: org.id,
        archiveNumber: `ARC-TEST-PROG-${suffix}`,
        name: programsArchiveName,
        department: "Programs",
        status: "Draft",
        createdById: deptUser.id,
      },
    });
    // Created by a different (admin) user, in a department the dept user
    // isn't in — must not be visible to them.
    const admin = await prisma.user.findFirstOrThrow({ where: { organizationId: org.id, email: "admin@demo-ngo.org" } });
    await prisma.archive.create({
      data: {
        organizationId: org.id,
        archiveNumber: `ARC-TEST-FIN-${suffix}`,
        name: financeArchiveName,
        department: "Finance",
        status: "Draft",
        createdById: admin.id,
      },
    });
  }, 60_000);

  it("a Department User (canViewAll=false) only sees their own department's archives", async () => {
    const results = await searchArchives(deptUserPrograms, {});
    const archiveNames = results.map((f) => f.folder.archive.name);

    // Neither seeded archive has files, so assert via a direct query using
    // the same visibility rule the search path uses, scoped to just these
    // two test archives by name.
    const { archiveVisibilityWhere } = await import("@/lib/visibility");
    const visible = await prisma.archive.findMany({
      where: { ...archiveVisibilityWhere(deptUserPrograms), name: { in: [programsArchiveName, financeArchiveName] } },
      select: { name: true },
    });

    expect(visible.map((a) => a.name)).toEqual([programsArchiveName]);
    expect(archiveNames).not.toContain(financeArchiveName);
  });
});
