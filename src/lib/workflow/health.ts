import "server-only";
import { prisma } from "@/lib/prisma";
import { computeArchiveHealth, type ArchiveHealth } from "@/lib/archive-health";

// Resolves an archive's plain-string status against its org's configured
// WorkflowState list. If the org hasn't configured a workflow yet (or the
// archive's status doesn't match any configured state — e.g. legacy data,
// or a state that was since renamed), falls back to treating the status
// as neither initial nor terminal, which computeArchiveHealth resolves to
// "needs_attention" rather than silently reporting healthy.
export async function resolveArchiveHealth(
  organizationId: string,
  status: string,
  missingMandatoryFolders: number
): Promise<ArchiveHealth> {
  const state = await prisma.workflowState.findUnique({
    where: { organizationId_name: { organizationId, name: status } },
  });

  return computeArchiveHealth({
    missingMandatoryFolders,
    isInitialState: state?.isInitial ?? false,
    isTerminalState: state?.isTerminal ?? false,
  });
}

// Batch variant for list views (dashboard) — avoids one workflow-state
// query per archive row.
export async function resolveArchiveHealthBatch(
  organizationId: string,
  archives: { status: string; missingMandatoryFolders: number }[]
): Promise<ArchiveHealth[]> {
  const states = await prisma.workflowState.findMany({ where: { organizationId } });
  const byName = new Map(states.map((s) => [s.name, s]));

  return archives.map(({ status, missingMandatoryFolders }) => {
    const state = byName.get(status);
    return computeArchiveHealth({
      missingMandatoryFolders,
      isInitialState: state?.isInitial ?? false,
      isTerminalState: state?.isTerminal ?? false,
    });
  });
}
