// Material Symbols icon per logical file type (see src/lib/file-type.ts
// for how types are derived from filenames/mime types).
const FILE_TYPE_ICON: Record<string, string> = {
  pdf: "picture_as_pdf",
  word: "description",
  excel: "table_chart",
  powerpoint: "slideshow",
  image: "image",
  video: "smart_display",
  audio: "audio_file",
  zip: "folder_zip",
};

export function fileTypeIcon(fileType: string | null | undefined): string {
  return FILE_TYPE_ICON[fileType ?? ""] ?? "draft";
}
