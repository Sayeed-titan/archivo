import { describe, it, expect, beforeAll } from "vitest";
import { resetTestDb } from "../setup/reset-test-db";
import { prisma } from "@/lib/prisma";
import { getOrgWorkflow, getAvailableTransitions } from "@/lib/workflow/engine";

// Exercises the workflow engine against the org's *real* seeded
// configuration (Draft[initial] -> Pending Review -> Archived[terminal],
// with Pending Review -> Archived gated on mandatoryFoldersFilled — see
// prisma/seed.ts) instead of a hand-built fixture, so this breaks if either
// the engine or the seed's workflow shape drifts out of sync.
describe("workflow engine against the seeded org workflow", () => {
  let orgId: string;
  let adminId: string;

  beforeAll(async () => {
    await resetTestDb();
    const org = await prisma.organization.findUniqueOrThrow({ where: { slug: "demo-ngo" } });
    orgId = org.id;
    const admin = await prisma.user.findFirstOrThrow({ where: { organizationId: orgId, email: "admin@demo-ngo.org" } });
    adminId = admin.id;
  }, 60_000);

  it("getOrgWorkflow returns the seeded states in order and their transitions", async () => {
    const { states, transitions } = await getOrgWorkflow(orgId);
    expect(states.map((s) => s.name)).toEqual(["Draft", "Pending Review", "Archived"]);
    expect(states[0].isInitial).toBe(true);
    expect(states[2].isTerminal).toBe(true);
    expect(transitions.map((t) => `${t.fromState}->${t.toState}`).sort()).toEqual([
      "Draft->Pending Review",
      "Pending Review->Archived",
      "Pending Review->Draft",
    ]);
  });

  it("blocks Pending Review -> Archived while a mandatory folder is empty", async () => {
    const category = await prisma.category.findFirstOrThrow({ where: { organizationId: orgId, name: "Meetings" } });
    const archive = await prisma.archive.create({
      data: {
        organizationId: orgId,
        archiveNumber: "ARC-TEST-00001",
        name: "Gating test archive",
        categoryId: category.id,
        status: "Pending Review",
        createdById: adminId,
        folders: { create: [{ name: "01 Proposal", order: 0, isMandatory: true }] },
      },
      include: { folders: { include: { files: true, folderTemplate: true } } },
    });

    const transitions = await getAvailableTransitions(archive);
    const toArchived = transitions.find((t) => t.toState === "Archived");

    expect(toArchived).toBeDefined();
    expect(toArchived!.allowed).toBe(false);
    expect(toArchived!.checks.find((c) => c.requirement.kind === "mandatoryFoldersFilled")?.satisfied).toBe(false);
  });

  it("allows Pending Review -> Archived once the mandatory folder has a file", async () => {
    const category = await prisma.category.findFirstOrThrow({ where: { organizationId: orgId, name: "Meetings" } });
    const archive = await prisma.archive.create({
      data: {
        organizationId: orgId,
        archiveNumber: "ARC-TEST-00002",
        name: "Gating test archive 2",
        categoryId: category.id,
        status: "Pending Review",
        createdById: adminId,
        folders: {
          create: [
            {
              name: "01 Proposal",
              order: 0,
              isMandatory: true,
              files: {
                create: [
                  {
                    filename: "proposal.pdf",
                    fileType: "pdf",
                    mimeType: "application/pdf",
                    sizeBytes: 100,
                    storagePath: "test-only-not-a-real-file",
                    uploadedById: adminId,
                  },
                ],
              },
            },
          ],
        },
      },
      include: { folders: { include: { files: true, folderTemplate: true } } },
    });

    const transitions = await getAvailableTransitions(archive);
    const toArchived = transitions.find((t) => t.toState === "Archived");

    expect(toArchived!.allowed).toBe(true);
  });

  it("offers no transitions for a state with no outgoing edges (Archived is terminal)", async () => {
    const category = await prisma.category.findFirstOrThrow({ where: { organizationId: orgId, name: "Meetings" } });
    const archive = await prisma.archive.create({
      data: {
        organizationId: orgId,
        archiveNumber: "ARC-TEST-00003",
        name: "Already archived",
        categoryId: category.id,
        status: "Archived",
        createdById: adminId,
      },
      include: { folders: { include: { files: true, folderTemplate: true } } },
    });

    const transitions = await getAvailableTransitions(archive);
    expect(transitions).toEqual([]);
  });
});
