import "server-only";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import type { ReportRow } from "./execute";
import type { ExportColumn } from "./export-excel";

const PAGE_WIDTH = 841.89; // A4 landscape
const PAGE_HEIGHT = 595.28;
const MARGIN = 36;
const ROW_HEIGHT = 18;
const FONT_SIZE = 9;

// SRS.md FR-11.5: optional watermark on exported documents. Drawn as a
// large, diagonal, low-opacity text repeated across the page so it
// survives printing/screenshots without obscuring the table underneath.
function drawWatermark(page: import("pdf-lib").PDFPage, font: import("pdf-lib").PDFFont, text: string) {
  const size = 28;
  const textWidth = font.widthOfTextAtSize(text, size);
  const step = textWidth + 80;

  for (let x = -PAGE_HEIGHT; x < PAGE_WIDTH + PAGE_HEIGHT; x += step) {
    page.drawText(text, {
      x,
      y: PAGE_HEIGHT / 2,
      size,
      font,
      color: rgb(0.6, 0.6, 0.6),
      opacity: 0.15,
      rotate: degrees(-30),
    });
  }
}

// Field-agnostic: takes explicit {key, label} columns (see export-excel.ts).
export async function buildPdfReport(
  title: string,
  columns: ExportColumn[],
  rows: ReportRow[],
  watermarkText?: string
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const columnWidth = (PAGE_WIDTH - MARGIN * 2) / columns.length;
  const rowsPerPage = Math.floor((PAGE_HEIGHT - MARGIN * 2 - 60) / ROW_HEIGHT);

  const labels = columns.map((c) => c.label);
  const keys = columns.map((c) => c.key);

  function drawHeader(page: import("pdf-lib").PDFPage, y: number) {
    if (watermarkText) drawWatermark(page, boldFont, watermarkText);

    page.drawText(title, { x: MARGIN, y: PAGE_HEIGHT - MARGIN, size: 14, font: boldFont });
    page.drawText(`Generated ${new Date().toLocaleString()} · ${rows.length} rows`, {
      x: MARGIN,
      y: PAGE_HEIGHT - MARGIN - 16,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    labels.forEach((label, i) => {
      page.drawText(label, { x: MARGIN + i * columnWidth, y, size: FONT_SIZE, font: boldFont });
    });
  }

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN - 50;
  drawHeader(page, y);
  y -= ROW_HEIGHT;

  let rowsOnPage = 0;
  for (const row of rows) {
    if (rowsOnPage >= rowsPerPage) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN - 50;
      drawHeader(page, y);
      y -= ROW_HEIGHT;
      rowsOnPage = 0;
    }

    keys.forEach((key, i) => {
      const value = row[key];
      const text = value === null || value === undefined ? "-" : String(value);
      page.drawText(text.slice(0, 40), { x: MARGIN + i * columnWidth, y, size: FONT_SIZE, font });
    });

    y -= ROW_HEIGHT;
    rowsOnPage += 1;
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
