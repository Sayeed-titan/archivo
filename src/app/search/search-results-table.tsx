"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui";
import { Icon } from "@/components/icon";
import { fileTypeIcon } from "@/lib/file-icon";
import { useSnackbar } from "@/components/ui/snackbar";

export type SearchResultRow = {
  id: string;
  filename: string;
  fileType: string;
  archiveId: string;
  archiveName: string;
  donor: string;
  uploadedBy: string;
  uploadedAt: string;
};

const COLUMNS: DataTableColumn<SearchResultRow>[] = [
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
  { key: "fileType", label: "Type" },
  {
    key: "archiveName",
    label: "Archive",
    render: (row) => (
      <Link href={`/archives/${row.archiveId}`} className="text-on-surface hover:text-primary hover:underline">
        {row.archiveName}
      </Link>
    ),
  },
  { key: "donor", label: "Donor" },
  { key: "uploadedBy", label: "Uploaded by" },
  { key: "uploadedAt", label: "Date" },
];

export function SearchResultsTable({ rows, exportQuery }: { rows: SearchResultRow[]; exportQuery: string }) {
  const { showSnackbar } = useSnackbar();

  async function handleExport(format: "excel" | "pdf") {
    const res = await fetch(`/search/export?format=${format}&${exportQuery}`, { method: "POST" });
    if (!res.ok) {
      showSnackbar("Export failed.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = format === "excel" ? "search-results.xlsx" : "search-results.pdf";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DataTable
      rows={rows}
      columns={COLUMNS}
      getRowKey={(row) => row.id}
      emptyMessage="No matching files."
      storageKey="search-results-table-files"
      onExport={handleExport}
    />
  );
}
