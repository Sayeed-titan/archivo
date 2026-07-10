"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { Tabs, ClearableSearchField, DateRangePicker, Button, EmptyState } from "@/components/ui";
import { DataTable, type DataTableColumn } from "@/components/ui";
import { fileTypeIcon } from "@/lib/file-icon";

export type RecentUploadRow = {
  id: string;
  filename: string;
  fileType: string;
  uploadedByName: string;
  archiveId: string;
  archiveName: string;
  uploadedAt: string;
};

const BROWSE_COLUMNS: DataTableColumn<RecentUploadRow>[] = [
  {
    key: "filename",
    label: "File",
    render: (row) => (
      <Link href={`/archives/${row.archiveId}`} className="flex min-w-0 items-center gap-2 text-on-surface hover:text-primary hover:underline">
        <Icon name={fileTypeIcon(row.fileType)} size={18} className="shrink-0 text-on-surface-variant" />
        <span className="truncate">{row.filename}</span>
      </Link>
    ),
  },
  {
    key: "archiveName",
    label: "Archive",
    render: (row) => (
      <Link href={`/archives/${row.archiveId}`} className="text-on-surface hover:text-primary hover:underline">
        {row.archiveName}
      </Link>
    ),
  },
  { key: "uploadedByName", label: "Uploaded by" },
  { key: "uploadedAt", label: "Date" },
];

export function RecentUploadsCard({
  recent,
  browseResults,
  browseQuery,
  browseDateFrom,
  browseDateFromEnd,
  hasBrowseParams,
}: {
  recent: RecentUploadRow[];
  browseResults: RecentUploadRow[];
  browseQuery: string;
  browseDateFrom: string;
  browseDateFromEnd: string;
  hasBrowseParams: boolean;
}) {
  return (
    <Tabs
      defaultTab="search"
      tabs={[
        {
          key: "search",
          label: "Search",
          content: (
            <div className="p-3">
              <form action="/dashboard" className="space-y-2">
                <input type="hidden" name="tab" value="uploads-browse" />
                <ClearableSearchField name="uploadsQ" defaultValue={browseQuery} placeholder="Search by filename or archive name…" />
                <div className="flex flex-wrap items-center gap-2">
                  <DateRangePicker
                    name="uploadsDateFrom"
                    compact
                    className="w-56"
                    defaultStart={browseDateFrom}
                    defaultEnd={browseDateFromEnd}
                  />
                  <Button type="submit" size="sm" icon="search">
                    Search
                  </Button>
                  {(browseQuery || browseDateFrom) && (
                    <Button href="/dashboard" variant="text" size="sm">
                      Clear
                    </Button>
                  )}
                </div>
              </form>
              <div className="mt-3">
                {browseResults.length > 0 || hasBrowseParams ? (
                  <DataTable
                    rows={browseResults}
                    columns={BROWSE_COLUMNS}
                    getRowKey={(row) => row.id}
                    emptyMessage="No files match your search."
                    storageKey="dashboard-uploads-browse-table"
                    initialPageSize={10}
                  />
                ) : (
                  <p className="px-1 py-6 text-center type-body-small text-on-surface-variant">
                    Search by filename or archive name, or set a date range, to browse uploaded files.
                  </p>
                )}
              </div>
            </div>
          ),
        },
        {
          key: "recentUploads",
          label: "Recent Uploads",
          content: (
            <div>
              {recent.length > 0 ? (
                <ul className="divide-y divide-outline-variant/60">
                  {recent.map((file) => (
                    <li key={file.id} className="flex items-start gap-3 px-4 py-2.5">
                      <Icon name={fileTypeIcon(file.fileType)} size={20} className="mt-0.5 text-on-surface-variant" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate type-body-medium text-on-surface">{file.filename}</span>
                          <span className="whitespace-nowrap type-body-small text-on-surface-variant">{file.uploadedAt}</span>
                        </div>
                        <p className="truncate type-body-small text-on-surface-variant">
                          {file.uploadedByName} · {file.archiveName}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon="cloud_upload"
                  title="No uploads yet"
                  description="Files added to any archive will show up here."
                  action={
                    <Button href="/inbox" variant="tonal" size="sm">
                      Open Migration Inbox
                    </Button>
                  }
                />
              )}
            </div>
          ),
        },
      ]}
    />
  );
}
