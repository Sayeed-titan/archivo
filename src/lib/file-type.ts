const EXTENSION_TYPES: Record<string, string> = {
  pdf: "pdf",
  doc: "word",
  docx: "word",
  xls: "excel",
  xlsx: "excel",
  ppt: "powerpoint",
  pptx: "powerpoint",
  jpg: "image",
  jpeg: "image",
  png: "image",
  gif: "image",
  mp4: "video",
  mov: "video",
  mp3: "audio",
  wav: "audio",
  zip: "zip",
};

// SRS.md FR-4.1: PDF/Word/Excel/PowerPoint/Images/Video/Audio/ZIP.
export function classifyFileType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TYPES[ext] ?? "other";
}
