"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HealthBadge } from "@/components/health-badge";
import { Badge, Button, ClearableSearchField, DateRangePicker, EmptyState } from "@/components/ui";
import type { ArchiveHealth } from "@/lib/archive-health";

const STATUS_TONE: Record<string, "success" | "warning" | "neutral"> = {
  Archived: "success",
  "Pending Review": "warning",
  Draft: "neutral",
};

export type RecentArchiveRow = {
  id: string;
  name: string;
  categoryName: string;
  status: string;
  createdAt: string; // display string, already formatted
  eventDateMs: number | null; // start of [eventDate, eventEndDate ?? eventDate]
  eventEndDateMs: number | null; // end of that span
  health: ArchiveHealth;
};

// Instant client-side filter over the dashboard's already-fetched Recent
// Archives preview (10 rows) — typing a name or picking a date narrows
// the same list in place; clicking a row still navigates to that
// archive's page as before. This is deliberately NOT a server round trip
// (unlike /archives, the full browse page) since it's filtering a small,
// already-loaded preview list, not querying the full dataset.
export function RecentArchivesCard({
  archives,
  canCreateArchive,
}: {
  archives: RecentArchiveRow[];
  canCreateArchive: boolean;
}) {
  const [q, setQ] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const from = dateStart ? new Date(`${dateStart}T00:00:00`).getTime() : null;
    const to = dateEnd ? new Date(`${dateEnd}T23:59:59.999`).getTime() : from ? new Date(`${dateStart}T23:59:59.999`).getTime() : null;

    return archives.filter((archive) => {
      if (query && !archive.name.toLowerCase().includes(query)) return false;
      if (from !== null || to !== null) {
        if (archive.eventDateMs === null) return false;
        const spanStart = archive.eventDateMs;
        const spanEnd = archive.eventEndDateMs ?? archive.eventDateMs;
        if (from !== null && spanEnd < from) return false;
        if (to !== null && spanStart > to) return false;
      }
      return true;
    });
  }, [archives, q, dateStart, dateEnd]);

  const isFiltering = q.trim() !== "" || dateStart !== "";

  return (
    <div>
      <div className="space-y-2 border-b border-outline-variant px-4 py-3">
        <ClearableSearchField
          name="recentArchivesFilter"
          placeholder="Filter archives by name…"
          className="w-full"
          onChange={setQ}
        />
        <DateRangePicker
          name="recentArchivesDate"
          compact
          className="w-full"
          onChangeStart={setDateStart}
          onChangeEnd={setDateEnd}
        />
      </div>

      {filtered.length > 0 ? (
        <ul className="divide-y divide-outline-variant/60">
          {filtered.map((archive) => (
            <li key={archive.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/archives/${archive.id}`}
                  className="truncate font-medium text-on-surface hover:text-primary hover:underline"
                >
                  {archive.name}
                </Link>
                <span className="whitespace-nowrap type-body-small text-on-surface-variant">{archive.createdAt}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="type-body-small text-on-surface-variant">{archive.categoryName}</span>
                <Badge tone={STATUS_TONE[archive.status] ?? "neutral"}>{archive.status}</Badge>
                <HealthBadge health={archive.health} />
              </div>
            </li>
          ))}
        </ul>
      ) : isFiltering ? (
        <EmptyState icon="search_off" title="No matches" description="No recent archives match that filter." />
      ) : (
        <EmptyState
          icon="folder_off"
          title="No archives yet"
          description="Create the first one to get started."
          action={
            canCreateArchive ? (
              <Button href="/archives/new" variant="tonal" size="sm">
                New Archive
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
