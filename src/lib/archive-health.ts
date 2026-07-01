// Archive Health (HANDOFF.md point 6): combine missing-mandatory-folder
// status with review status into one score/badge per archive — cheap to
// compute, high signal for the dashboard and triage.

export type ArchiveHealthLevel = "healthy" | "needs_attention" | "critical";

export type ArchiveHealthInput = {
  status: string;
  missingMandatoryFolders: number;
};

export type ArchiveHealth = {
  level: ArchiveHealthLevel;
  label: string;
  missingMandatoryFolders: number;
};

export function computeArchiveHealth({ status, missingMandatoryFolders }: ArchiveHealthInput): ArchiveHealth {
  if (missingMandatoryFolders > 0 && status === "Archived") {
    // Marked complete/archived but mandatory documents are still missing —
    // the worst case: it looks done but isn't audit-ready.
    return { level: "critical", label: "Critical — missing required docs", missingMandatoryFolders };
  }

  if (missingMandatoryFolders > 0 || status === "Pending Review") {
    return { level: "needs_attention", label: "Needs attention", missingMandatoryFolders };
  }

  return { level: "healthy", label: "Healthy", missingMandatoryFolders };
}

export const HEALTH_BADGE_CLASSES: Record<ArchiveHealthLevel, string> = {
  healthy: "bg-emerald-50 text-emerald-700 border-emerald-200",
  needs_attention: "bg-amber-50 text-amber-700 border-amber-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};
