import "server-only";
import { buildExcelReport, type ExportColumn } from "@/lib/reports/export-excel";
import { buildPdfReport } from "@/lib/reports/export-pdf";

// Server-side export for the generic DataTable's "Export" menu, reusing
// the exact same field-agnostic builders the report engine uses (see
// src/lib/reports/export-excel.ts / export-pdf.ts) — no report-specific
// coupling in either function, so this needs no changes there.
//
// Each consuming page (audit-log, reports run page, dashboard, search)
// owns a small route that reruns its own query and calls this — there is
// deliberately no single "god route" that has to know every entity's
// shape.

export type ExportRow = Record<string, string | number | null>;

export async function exportDataTable(
  format: "excel" | "pdf",
  title: string,
  columns: ExportColumn[],
  rows: ExportRow[],
  watermarkText?: string
): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
  if (format === "excel") {
    return {
      buffer: await buildExcelReport(title, columns, rows),
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: `${title}.xlsx`,
    };
  }
  return {
    buffer: await buildPdfReport(title, columns, rows, watermarkText),
    contentType: "application/pdf",
    filename: `${title}.pdf`,
  };
}
