// Folder colorization (file-explorer UX). Deliberately built on the app's
// existing MD3 color ROLES (primary/secondary/tertiary-equivalent/error/
// success/warning), not literal hex values — this app's whole theme is
// org-configurable from a single seed color (see CLAUDE.md's Material
// Design 3 section), so a fixed hex palette would look inconsistent or
// clash the moment an org picks a different brand color. Each option here
// just tints the folder icon with a token that already exists for every
// org's generated scheme.

export type FolderColorKey = "primary" | "secondary" | "success" | "warning" | "error" | "neutral";

export const FOLDER_COLORS: { key: FolderColorKey; label: string; iconClassName: string; swatchClassName: string }[] = [
  { key: "neutral", label: "Default", iconClassName: "text-on-surface-variant", swatchClassName: "bg-on-surface-variant" },
  { key: "primary", label: "Primary", iconClassName: "text-primary", swatchClassName: "bg-primary" },
  { key: "secondary", label: "Secondary", iconClassName: "text-secondary", swatchClassName: "bg-secondary" },
  { key: "success", label: "Green", iconClassName: "text-success", swatchClassName: "bg-success" },
  { key: "warning", label: "Amber", iconClassName: "text-warning", swatchClassName: "bg-warning" },
  { key: "error", label: "Red", iconClassName: "text-error", swatchClassName: "bg-error" },
];

const BY_KEY = new Map(FOLDER_COLORS.map((c) => [c.key, c]));

export function folderIconClassName(color: string | null | undefined): string {
  return (color && BY_KEY.get(color as FolderColorKey)?.iconClassName) || FOLDER_COLORS[0].iconClassName;
}
