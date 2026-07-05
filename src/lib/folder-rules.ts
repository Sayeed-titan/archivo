// Configurable per-sub-folder upload rules (FolderTemplate.rules), stored as
// JSON so new rule kinds can be added without a migration — same pattern as
// src/lib/workflow/requirements.ts. Enforced at upload time in
// src/lib/file-storage.ts (processUpload) and surfaced as a workflow
// requirement kind (folderTypeCountsSatisfied) in
// src/lib/workflow/requirements.ts.

// Mirrors the categories classifyFileType() (src/lib/file-type.ts) returns —
// don't introduce a second file-type enum.
export const FILE_TYPE_CATEGORIES = [
  "pdf",
  "word",
  "excel",
  "powerpoint",
  "image",
  "video",
  "audio",
  "zip",
  "other",
] as const;

export type FileTypeCategory = (typeof FILE_TYPE_CATEGORIES)[number];

export type FileTypeCount = { min?: number; max?: number };

export type FolderRules = {
  allowedFileTypes?: FileTypeCategory[];
  minResolution?: { width: number; height: number };
  maxSizeBytes?: number;
  counts?: Partial<Record<FileTypeCategory, FileTypeCount>>;
  alternateOptions?: { enabled: boolean; options: string[] };
  externalLinkFallback?: { enabled: boolean; helpText?: string };
};

function isFileTypeCategory(value: unknown): value is FileTypeCategory {
  return typeof value === "string" && (FILE_TYPE_CATEGORIES as readonly string[]).includes(value);
}

function parseCounts(value: unknown): FolderRules["counts"] {
  if (typeof value !== "object" || value === null) return undefined;
  const result: FolderRules["counts"] = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!isFileTypeCategory(key) || typeof raw !== "object" || raw === null) continue;
    const { min, max } = raw as Record<string, unknown>;
    const entry: FileTypeCount = {};
    if (typeof min === "number" && min >= 0) entry.min = min;
    if (typeof max === "number" && max >= 0) entry.max = max;
    if (entry.min !== undefined || entry.max !== undefined) result[key] = entry;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

// Safe parse: a malformed/legacy value (e.g. "{}") always yields a valid,
// empty-rules object rather than throwing.
export function parseFolderRules(json: unknown): FolderRules {
  if (typeof json !== "object" || json === null) return {};
  const candidate = json as Record<string, unknown>;
  const rules: FolderRules = {};

  if (Array.isArray(candidate.allowedFileTypes)) {
    const types = candidate.allowedFileTypes.filter(isFileTypeCategory);
    if (types.length > 0) rules.allowedFileTypes = types;
  }

  if (typeof candidate.minResolution === "object" && candidate.minResolution !== null) {
    const { width, height } = candidate.minResolution as Record<string, unknown>;
    if (typeof width === "number" && typeof height === "number" && width > 0 && height > 0) {
      rules.minResolution = { width, height };
    }
  }

  if (typeof candidate.maxSizeBytes === "number" && candidate.maxSizeBytes > 0) {
    rules.maxSizeBytes = candidate.maxSizeBytes;
  }

  const counts = parseCounts(candidate.counts);
  if (counts) rules.counts = counts;

  if (typeof candidate.alternateOptions === "object" && candidate.alternateOptions !== null) {
    const { enabled, options } = candidate.alternateOptions as Record<string, unknown>;
    if (typeof enabled === "boolean") {
      rules.alternateOptions = {
        enabled,
        options: Array.isArray(options) ? options.filter((o): o is string => typeof o === "string" && o.trim().length > 0) : [],
      };
    }
  }

  if (typeof candidate.externalLinkFallback === "object" && candidate.externalLinkFallback !== null) {
    const { enabled, helpText } = candidate.externalLinkFallback as Record<string, unknown>;
    if (typeof enabled === "boolean") {
      rules.externalLinkFallback = { enabled, helpText: typeof helpText === "string" ? helpText : undefined };
    }
  }

  return rules;
}

export function describeFolderRules(rules: FolderRules): string[] {
  const lines: string[] = [];

  if (rules.allowedFileTypes?.length) {
    lines.push(`Accepted types: ${rules.allowedFileTypes.join(", ")}`);
  }
  if (rules.minResolution) {
    lines.push(`Minimum resolution: ${rules.minResolution.width}×${rules.minResolution.height}`);
  }
  if (rules.maxSizeBytes) {
    lines.push(`Max file size: ${(rules.maxSizeBytes / (1024 * 1024)).toFixed(1)} MB`);
  }
  if (rules.counts) {
    for (const [type, count] of Object.entries(rules.counts)) {
      const parts: string[] = [];
      if (count?.min !== undefined) parts.push(`min ${count.min}`);
      if (count?.max !== undefined) parts.push(`max ${count.max}`);
      if (parts.length > 0) lines.push(`${type}: ${parts.join(", ")}`);
    }
  }
  if (rules.alternateOptions?.enabled && rules.alternateOptions.options.length > 0) {
    lines.push(`Accepts either of: ${rules.alternateOptions.options.join(" or ")}`);
  }
  if (rules.externalLinkFallback?.enabled) {
    lines.push(rules.externalLinkFallback.helpText || "External link accepted if a file is too large to upload.");
  }

  return lines;
}
