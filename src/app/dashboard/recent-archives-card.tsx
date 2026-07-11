"use client";

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
  updatedAt: string; // display string, already formatted
  eventDate: string | null; // display string, already formatted (range shows as "start – end")
  health: ArchiveHealth;
};

// Search box searches the FULL archive set by event date (via
// browseArchives, the same query /archives uses) — not just the small
// 10-row "most recently created" preview. A "find my event from last
// month" search needs to look at every archive's actual event date, not
// be limited to whichever archives happen to have been created most
// recently, which is what a purely client-side filter over the preview
// would silently get wrong.
function ArchiveRowItem({ archive }: { archive: RecentArchiveRow }) {
  return (
    <li className="px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/archives/${archive.id}`} className="truncate font-medium text-on-surface hover:text-primary hover:underline">
          {archive.name}
        </Link>
        <span className="whitespace-nowrap type-body-small text-on-surface-variant">Updated {archive.updatedAt}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span className="type-body-small text-on-surface-variant">{archive.categoryName}</span>
        <Badge tone={STATUS_TONE[archive.status] ?? "neutral"}>{archive.status}</Badge>
        <HealthBadge health={archive.health} compact />
        {archive.eventDate && (
          <span className="inline-flex items-center gap-1 type-body-small text-on-surface-variant">
            <span className="text-on-surface-variant/60">·</span>
            Event: {archive.eventDate}
          </span>
        )}
      </div>
    </li>
  );
}

export function RecentArchivesCard({
  recent,
  searchResults,
  searchQuery,
  searchDateFrom,
  searchDateFromEnd,
  hasSearchParams,
  canCreateArchive,
}: {
  recent: RecentArchiveRow[];
  searchResults: RecentArchiveRow[];
  searchQuery: string;
  searchDateFrom: string;
  searchDateFromEnd: string;
  hasSearchParams: boolean;
  canCreateArchive: boolean;
}) {
  const rows = hasSearchParams ? searchResults : recent;

  return (
    <div>
      <form action="/dashboard" className="space-y-2 border-b border-outline-variant px-4 py-3">
        <ClearableSearchField name="archivesQ" defaultValue={searchQuery} placeholder="Search archives by name…" className="w-full" />
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            name="archivesDateFrom"
            compact
            className="flex-1"
            defaultStart={searchDateFrom}
            defaultEnd={searchDateFromEnd}
          />
          <Button type="submit" size="sm" icon="search">
            Search
          </Button>
          {hasSearchParams && (
            <Button href="/dashboard" variant="text" size="sm">
              Clear
            </Button>
          )}
        </div>
        {hasSearchParams && (
          <p className="type-body-small text-on-surface-variant">
            Searches by event date — e.g. set a range from last month to today to find every event held in that window.
          </p>
        )}
      </form>

      {rows.length > 0 ? (
        <ul className="divide-y divide-outline-variant/60">
          {rows.map((archive) => (
            <ArchiveRowItem key={archive.id} archive={archive} />
          ))}
        </ul>
      ) : hasSearchParams ? (
        <EmptyState icon="search_off" title="No matches" description="No archives had an event in that range or matched that name." />
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
