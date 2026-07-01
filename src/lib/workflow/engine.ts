import "server-only";
import { prisma } from "@/lib/prisma";
import { parseRequirements, type WorkflowRequirement } from "./requirements";
import type { Archive, Folder, File as PrismaFile } from "@/generated/prisma/client";

type ArchiveWithFolders = Archive & {
  folders: (Folder & { files: Pick<PrismaFile, "id">[] })[];
};

export type RequirementCheck = {
  requirement: WorkflowRequirement;
  satisfied: boolean;
};

export function evaluateRequirement(archive: ArchiveWithFolders, requirement: WorkflowRequirement): boolean {
  if (requirement.kind === "mandatoryFoldersFilled") {
    return archive.folders.every((f) => !f.isMandatory || f.files.length > 0);
  }
  if (requirement.kind === "fieldRequired") {
    const value = (archive as unknown as Record<string, unknown>)[requirement.field];
    return value !== null && value !== undefined && value !== "";
  }
  return false;
}

export function evaluateRequirements(archive: ArchiveWithFolders, requirements: WorkflowRequirement[]): RequirementCheck[] {
  return requirements.map((requirement) => ({
    requirement,
    satisfied: evaluateRequirement(archive, requirement),
  }));
}

export async function getOrgWorkflow(organizationId: string) {
  const [states, transitions] = await Promise.all([
    prisma.workflowState.findMany({ where: { organizationId }, orderBy: { order: "asc" } }),
    prisma.workflowTransition.findMany({ where: { organizationId } }),
  ]);
  return { states, transitions };
}

// What states can this archive move to right now, and are the
// requirements for each currently met? Used to render the transition UI
// and to gate the actual status-change action server-side.
export async function getAvailableTransitions(archive: ArchiveWithFolders) {
  const transitions = await prisma.workflowTransition.findMany({
    where: { organizationId: archive.organizationId, fromState: archive.status },
  });

  return transitions.map((t) => {
    const requirements = parseRequirements(t.requirements);
    const checks = evaluateRequirements(archive, requirements);
    return {
      toState: t.toState,
      checks,
      allowed: checks.every((c) => c.satisfied),
    };
  });
}
