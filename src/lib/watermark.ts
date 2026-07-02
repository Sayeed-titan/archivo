import "server-only";
import sharp from "sharp";

// SRS.md FR-11.5: optional watermark on downloaded images. Applied at
// download time (not at upload time) so the stored original is never
// modified — turning watermarking off later, or re-downloading for
// internal editing, always has access to the clean source file.
export async function applyImageWatermark(buffer: Buffer, text: string): Promise<Buffer> {
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const width = metadata.width ?? 800;
  const height = metadata.height ?? 600;

  const fontSize = Math.max(14, Math.round(width / 40));
  const escapedText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .watermark {
          fill: rgba(255, 255, 255, 0.65);
          stroke: rgba(0, 0, 0, 0.35);
          stroke-width: 0.5;
          font-size: ${fontSize}px;
          font-family: sans-serif;
        }
      </style>
      <text x="50%" y="97%" text-anchor="middle" class="watermark">${escapedText}</text>
    </svg>
  `;

  return image
    .composite([{ input: Buffer.from(svg), gravity: "south" }])
    .toBuffer();
}

export const WATERMARKABLE_FILE_TYPES = new Set(["image"]);
