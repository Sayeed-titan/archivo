import { Badge } from "@/components/ui/badge";
import type { ArchiveHealth, ArchiveHealthLevel } from "@/lib/archive-health";

const TONE_BY_LEVEL: Record<ArchiveHealthLevel, "success" | "warning" | "danger"> = {
  healthy: "success",
  needs_attention: "warning",
  critical: "danger",
};

export function HealthBadge({ health }: { health: ArchiveHealth }) {
  return (
    <Badge tone={TONE_BY_LEVEL[health.level]} className="font-medium">
      {health.label}
      {health.missingMandatoryFolders > 0 && ` (${health.missingMandatoryFolders} missing)`}
    </Badge>
  );
}
