import "server-only";
import ExcelJS from "exceljs";
import { getFieldDef } from "./fields";
import type { ReportRow } from "./execute";

export async function buildExcelReport(title: string, fields: string[], rows: ReportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title.slice(0, 31)); // Excel sheet name limit

  sheet.columns = fields.map((key) => ({
    header: getFieldDef(key)?.label ?? key,
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
