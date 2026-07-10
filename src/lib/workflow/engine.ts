import "server-only";
import { prisma, withConnectionRetry } from "@/lib/prisma";
import { parseRequirements, type WorkflowRequirement } from "./requirements";
import { parseFolderRules } from "@/lib/folder-rules";
import type { Archive, Folder, FolderTemplate, File as PrismaFile } from "@/generated/prisma/client";

type ArchiveWithFolders = Archive & {
  folders: (Folder & {
    files: Pick<PrismaFile, "id" | "fileType">[];
    folderTemplate?: Pick<FolderTemplate, "rules"> | null;
  })[];
};

export type RequirementCheck = {
  requirement: WorkflowRequirement;
  satisfied: boolean;
};

export function evaluateRequirement(archive: ArchiveWithFolders, requirement: WorkflowRequirement): boolean {
  if (requirement.kind === "mandatoryFoldersFilled") {
    return archive.folders.every((f) => !f.isMandatory || f.files.length > 0);
  }
  if (requirement.kind === "folderTypeCountsSatisfied") {
    return archive.folders.every((f) => {
      const counts = f.folderTemplate ? parseFolderRules(f.folderTemplate.rules).counts : undefined;
      if (!counts) return true;
      return Object.entries(counts).every(([fileType, rule]) => {
        if (rule?.min === undefined) return true;
        const actual = f.files.filter((file) => file.fileType === fileType).length;
        return actual >= rule.min;
      });
    });
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
    withConnectionRetry(() => prisma.workflowState.findMany({ where: { organizationId }, orderBy: { order: "asc" } })),
    withConnectionRetry(() => prisma.workflowTransition.findMany({ where: { organizationId } })),
  ]);
  return { states, transitions };
}

// What states can this archive move to right now, and are the
// requirements for each currently met? Used to render the transition UI
// and to gate the actual status-change action server-side.
export async function getAvailableTransitions(archive: ArchiveWithFolders) {
  const transitions = await withConnectionRetry(() =>
    prisma.workflowTransition.findMany({
      where: { organizationId: archive.organizationId, fromState: archive.status },
    })
  );

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
