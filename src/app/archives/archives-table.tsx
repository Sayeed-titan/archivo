"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn, Badge } from "@/components/ui";
import { HealthBadge } from "@/components/health-badge";
import { useSnackbar } from "@/components/ui/snackbar";
import type { ArchiveHealth } from "@/lib/archive-health";

const STATUS_TONE: Record<string, "success" | "warning" | "neutral"> = {
  Archived: "success",
  "Pending Review": "warning",
  Draft: "neutral",
};

export type ArchiveRow = {
  id: string;
  name: string;
  archiveNumber: string;
  categoryName: string;
  status: string;
  eventDate: string | null;
  updatedAt: string;
  fileCount: number;
  health: ArchiveHealth;
};

const COLUMNS: DataTableColumn<ArchiveRow>[] = [
  {
    key: "name",
    label: "Archive",
    render: (row) => (
      <Link href={`/archives/${row.id}`} className="text-on-surface hover:text-primary hover:underline">
        {row.name}
      </Link>
    ),
    toExportValue: (row) => row.name,
  },
  { key: "archiveNumber", label: "ID" },
  { key: "categoryName", label: "Category" },
  {
    key: "status",
    label: "Status",
    render: (row) => <Badge tone={STATUS_TONE[row.status] ?? "neutral"}>{row.status}</Badge>,
    toExportValue: (row) => row.status,
  },
  {
    key: "health",
    label: "Health",
    render: (row) => <HealthBadge health={row.health} compact />,
    toExportValue: (row) => row.health.label,
  },
  { key: "eventDate", label: "Event date", render: (row) => row.eventDate ?? "—" },
  { key: "fileCount", label: "Files" },
  { key: "updatedAt", label: "Last updated" },
];

export function ArchivesTable({ rows, exportQuery }: { rows: ArchiveRow[]; exportQuery: string }) {
  const { showSnackbar } = useSnackbar();

  async function handleExport(format: "excel" | "pdf") {
    const res = await fetch(`/archives/export?format=${format}&${exportQuery}`, { method: "POST" });
    if (!res.ok) {
      showSnackbar("Export failed.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = format === "excel" ? "archives.xlsx" : "archives.pdf";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DataTable
      rows={rows}
      columns={COLUMNS}
      getRowKey={(row) => row.id}
      emptyMessage="No archives match your filters."
      storageKey="archives-browse-table"
      onExport={handleExport}
    />
  );
}
