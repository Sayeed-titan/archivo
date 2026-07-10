// Token-based upload filename template, configured per-org at
// /settings/file-naming and stored as Organization.fileNamingTemplate.
// Resolved once per upload in saveUploadedFile() — the computed name
// becomes the File.filename shown everywhere (rows, downloads, exports),
// the original browser-supplied name is never separately retained.

export type NamingContext = {
  originalName: string; // full filename as uploaded, including extension
  folderName: string;
  archiveName: string;
  archiveNumber: string;
  eventDate: Date | null;
  department: string | null;
  sequence: number; // 1-based position among files already in the folder
};

export const NAMING_TOKENS = [
  { token: "{originalName}", label: "Original file name", description: "The name of the file as uploaded (without its extension)." },
  { token: "{folderName}", label: "Folder name", description: "The folder the file was uploaded into, e.g. \"Photos\"." },
  { token: "{archiveName}", label: "Archive name", description: "The archive's name, e.g. \"Annual General Meeting 2027\"." },
  { token: "{archiveNumber}", label: "Archive number", description: "The auto-generated ID, e.g. \"ARC-2026-00042\"." },
  { token: "{eventDate}", label: "Event date", description: "The archive's event date as YYYY-MM-DD, blank if not set." },
  { token: "{uploadDate}", label: "Upload date", description: "Today's date as YYYY-MM-DD." },
  { token: "{department}", label: "Department", description: "The archive's department, blank if not set." },
  { token: "{sequence}", label: "Sequence number", description: "Auto-incrementing number, avoids collisions when other tokens repeat." },
] as const;

export const DEFAULT_NAMING_TEMPLATE = "{originalName}_{folderName}_{archiveName}_{eventDate}";

function toIsoDate(d: Date | null): string {
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Filesystem/URL-hostile characters stripped from each resolved segment —
// applied per-token, not to the separators the admin's template supplies,
// so "/" in a template used as a literal separator is untouched.
function sanitizeSegment(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, "-").trim();
}

function splitExtension(filename: string): { base: string; ext: string } {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return { base: filename, ext: "" };
  return { base: filename.slice(0, dot), ext: filename.slice(dot) };
}

export function resolveFileName(template: string, ctx: NamingContext): string {
  const { base, ext } = splitExtension(ctx.originalName);

  const values: Record<string, string> = {
    "{originalName}": base,
    "{folderName}": ctx.folderName,
    "{archiveName}": ctx.archiveName,
    "{archiveNumber}": ctx.archiveNumber,
    "{eventDate}": toIsoDate(ctx.eventDate),
    "{uploadDate}": toIsoDate(new Date()),
    "{department}": ctx.department ?? "",
    "{sequence}": String(ctx.sequence),
  };

  const resolved = template
    .split(/(\{[a-zA-Z]+\})/g)
    .map((part) => (part in values ? sanitizeSegment(values[part]) : part))
    .join("")
    // Collapse repeated/leading/trailing separators left behind by blank
    // tokens (e.g. a template ending in "_{eventDate}" with no event date
    // set) so the result doesn't end with a dangling "_" or "__".
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");

  return `${resolved || base}${ext}`;
}

// Live-preview helper for the settings page — uses representative sample
// values so an admin can see what their template produces before saving.
export function previewFileName(template: string): string {
  return resolveFileName(template, {
    originalName: "site-visit-photo.jpg",
    folderName: "Photos",
    archiveName: "Annual General Meeting 2027",
    archiveNumber: "ARC-2027-00012",
    eventDate: new Date(2027, 2, 15),
    department: "Programs",
    sequence: 1,
  });
}
