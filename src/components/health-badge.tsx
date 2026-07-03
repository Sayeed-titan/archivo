import { Badge } from "@/components/ui/badge";
import type { ArchiveHealth, ArchiveHealthLevel } from "@/lib/archive-health";

const TONE_BY_LEVEL: Record<ArchiveHealthLevel, "success" | "warning" | "danger"> = {
  healthy: "success",
  needs_attention: "warning",
  critical: "danger",
};

// `compact` drops the "(N missing)" suffix for dense contexts (dashboard
// summary tables) where the full detail is one click away on the
// archive's own page — the count moves into a title tooltip instead of
// disappearing entirely.
export function HealthBadge({ health, compact }: { health: ArchiveHealth; compact?: boolean }) {
  const suffix = health.missingMandatoryFolders > 0 ? ` (${health.missingMandatoryFolders} missing)` : "";
  return (
    <Badge tone={TONE_BY_LEVEL[health.level]} className="font-medium" title={compact ? `${health.label}${suffix}` : undefined}>
      {health.label}
      {!compact && suffix}
    </Badge>
  );
}
