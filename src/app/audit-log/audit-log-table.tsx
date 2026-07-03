"use client";

import { DataTable, Badge, type DataTableColumn } from "@/components/ui";
import { useSnackbar } from "@/components/ui/snackbar";

export type AuditLogRow = {
  id: string;
  when: string;
  who: string;
  action: string;
  entity: string;
  note: string;
};

const ACTION_TONE: Record<string, "success" | "info" | "danger" | "neutral"> = {
  create: "success",
  edit: "info",
  delete: "danger",
  hard_delete: "danger",
  download: "neutral",
};

const COLUMNS: DataTableColumn<AuditLogRow>[] = [
  { key: "when", label: "When" },
  { key: "who", label: "Who" },
  {
    key: "action",
    label: "Action",
    render: (row) => <Badge tone={ACTION_TONE[row.action] ?? "neutral"}>{row.action}</Badge>,
    toExportValue: (row) => row.action,
  },
  { key: "entity", label: "Entity" },
  { key: "note", label: "Note" },
];

export function AuditLogTable({
  rows,
  filters,
}: {
  rows: AuditLogRow[];
  filters: { actorId?: string; entityType?: string; action?: string };
}) {
  const { showSnackbar } = useSnackbar();

  async function handleExport(format: "excel" | "pdf") {
    const entries = Object.entries({ format, ...filters }).filter(([, v]) => v !== undefined) as [string, string][];
    const params = new URLSearchParams(entries);
    const res = await fetch(`/audit-log/export?${params}`, { method: "POST" });
    if (!res.ok) {
      showSnackbar("Export failed.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = format === "excel" ? "audit-log.xlsx" : "audit-log.pdf";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DataTable
      rows={rows}
      columns={COLUMNS}
      getRowKey={(row) => row.id}
      emptyMessage="No matching audit entries."
      storageKey="audit-log-table"
      onExport={handleExport}
    />
  );
}
