import "server-only";
import ExcelJS from "exceljs";
import { getFieldDef } from "./fields";
import type { ReportRow } from "./execute";

export type ExportColumn = { key: string; label: string };

// Field-agnostic: takes explicit {key, label} columns rather than looking
// labels up in the report field catalog, so it's reusable by any tabular
// data source (the report engine, or the generic DataTable's export
// button — see src/lib/data-table/export.ts) not just ReportTemplate.
export async function buildExcelReport(title: string, columns: ExportColumn[], rows: ReportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title.slice(0, 31)); // Excel sheet name limit

  sheet.columns = columns.map(({ key, label }) => ({
    header: label,
    key,
    width: 20,
  }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// Convenience for callers that only have report field keys (looks labels
// up via the report field catalog) — kept here so the report export
// route doesn't need to change its call shape.
export function columnsFromReportFields(fields: string[]): ExportColumn[] {
  return fields.map((key) => ({ key, label: getFieldDef(key)?.label ?? key }));
}
