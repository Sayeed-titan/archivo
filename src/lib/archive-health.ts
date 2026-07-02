// Archive Health (HANDOFF.md point 6, rewired in Prompt 7): combines
// missing-mandatory-folder status with the archive's position in its
// org's *own* configured workflow — not a hardcoded Draft/Pending
// Review/Archived assumption. "Critical" means the archive sits at a
// terminal state (e.g. whatever the org calls "Archived") while still
// missing mandatory documents — it looks done but isn't audit-ready.

export type ArchiveHealthLevel = "healthy" | "needs_attention" | "critical";

export type ArchiveHealthInput = {
  missingMandatoryFolders: number;
  isTerminalState: boolean;
  isInitialState: boolean;
};

export type ArchiveHealth = {
  level: ArchiveHealthLevel;
  label: string;
  missingMandatoryFolders: number;
};

export function computeArchiveHealth({
  missingMandatoryFolders,
  isTerminalState,
  isInitialState,
}: ArchiveHealthInput): ArchiveHealth {
  if (missingMandatoryFolders > 0 && isTerminalState) {
    return { level: "critical", label: "Critical — missing required docs", missingMandatoryFolders };
  }

  if (missingMandatoryFolders > 0 || (!isInitialState && !isTerminalState)) {
    return { level: "needs_attention", label: "Needs attention", missingMandatoryFolders };
  }

  return { level: "healthy", label: "Healthy", missingMandatoryFolders };
}
