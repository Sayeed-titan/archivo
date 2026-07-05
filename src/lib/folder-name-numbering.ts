// Folder template names conventionally carry a leading zero-padded number
// typed by the admin as plain text (e.g. "03 Budget") — order is a separate
// numeric column, so nothing keeps that visible prefix in sync with actual
// position on its own. reorderFolderTemplates() uses this to rewrite the
// prefix to match the new position whenever the set is reordered.

const NUMBERED_PREFIX = /^(\d+)(\s+)(.*)$/;

export function splitNumberedName(name: string): { padWidth: number; rest: string } | null {
  const match = name.match(NUMBERED_PREFIX);
  if (!match) return null;
  return { padWidth: match[1].length, rest: match[3] };
}

// Only renumbers names that already follow the "NN <rest>" convention —
// free-form names (no leading number) are left untouched.
export function renumberName(name: string, position: number): string {
  const parsed = splitNumberedName(name);
  if (!parsed) return name;
  const number = String(position + 1).padStart(parsed.padWidth, "0");
  return `${number} ${parsed.rest}`;
}
