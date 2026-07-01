import { HEALTH_BADGE_CLASSES, type ArchiveHealth } from "@/lib/archive-health";

export function HealthBadge({ health }: { health: ArchiveHealth }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${HEALTH_BADGE_CLASSES[health.level]}`}>
      {health.label}
      {health.missingMandatoryFolders > 0 && ` (${health.missingMandatoryFolders} missing)`}
    </span>
  );
}
