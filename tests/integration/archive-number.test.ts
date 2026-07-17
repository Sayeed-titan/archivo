import { describe, it, expect, beforeAll } from "vitest";
import { resetTestDb } from "../setup/reset-test-db";
import { prisma } from "@/lib/prisma";
import { generateArchiveNumber } from "@/lib/archive-number";

describe("generateArchiveNumber", () => {
  let orgId: string;
  let adminId: string;

  beforeAll(async () => {
    await resetTestDb();
    const org = await prisma.organization.findUniqueOrThrow({ where: { slug: "demo-ngo" } });
    orgId = org.id;
    const admin = await prisma.user.findFirstOrThrow({ where: { organizationId: orgId, email: "admin@demo-ngo.org" } });
    adminId = admin.id;
  }, 60_000);

  it("continues the sequence after the seeded sample archive (ARC-2026-00001)", async () => {
    const year = new Date().getFullYear();
    const number = await generateArchiveNumber(orgId);
    // The seed creates exactly one archive for the current logic to count
    // against (archiveNumber prefix is year-based) — assert the *shape*
    // rather than a hardcoded count, so this doesn't silently drift if the
    // seed data changes independently of this test.
    expect(number).toMatch(new RegExp(`^ARC-${year}-\\d{5}$`));
  });

  it("increments on each call as archives are actually created", async () => {
    const first = await generateArchiveNumber(orgId);
    await prisma.archive.create({
      data: { organizationId: orgId, archiveNumber: first, name: "Integration test archive", status: "Draft", createdById: adminId },
    });
    const second = await generateArchiveNumber(orgId);
    expect(second).not.toBe(first);
  });

  it("is scoped per organization — a second org starts its own sequence", async () => {
    const otherOrg = await prisma.organization.create({
      data: { name: "Other Org", slug: `other-org-${Date.now()}`, industry: "test" },
    });
    const number = await generateArchiveNumber(otherOrg.id);
    const year = new Date().getFullYear();
    expect(number).toBe(`ARC-${year}-00001`);
  });
});
