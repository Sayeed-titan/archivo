"use client";

import { useState, useTransition } from "react";
import { updateFolderTemplateRules } from "@/app/actions/folder-templates";
import { FILE_TYPE_CATEGORIES, type FileTypeCategory, type FolderRules } from "@/lib/folder-rules";
import { Dialog, Button, TextField, CheckboxField, TextareaField } from "@/components/ui";
import { Icon } from "@/components/icon";

function bytesToMb(bytes?: number): string {
  return bytes ? String(Math.round((bytes / (1024 * 1024)) * 100) / 100) : "";
}

function mbToBytes(mb: string): number | undefined {
  const n = Number(mb);
  return mb.trim() !== "" && n > 0 ? Math.round(n * 1024 * 1024) : undefined;
}

// Local editable shape mirrors FolderRules but keeps counts as an array of
// rows (one per file type the admin has added a count rule for) since
// that's easier to render/add/remove than a keyed object.
type CountRow = { fileType: FileTypeCategory; min: string; max: string };

function rulesToCountRows(rules: FolderRules): CountRow[] {
  if (!rules.counts) return [];
  return Object.entries(rules.counts).map(([fileType, c]) => ({
    fileType: fileType as FileTypeCategory,
    min: c?.min !== undefined ? String(c.min) : "",
    max: c?.max !== undefined ? String(c.max) : "",
  }));
}

export function FolderRulesEditor({ folderTemplateId, folderName, rules }: { folderTemplateId: string; folderName: string; rules: FolderRules }) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const [allowedFileTypes, setAllowedFileTypes] = useState<FileTypeCategory[]>(rules.allowedFileTypes ?? []);
  const [minWidth, setMinWidth] = useState(rules.minResolution ? String(rules.minResolution.width) : "");
  const [minHeight, setMinHeight] = useState(rules.minResolution ? String(rules.minResolution.height) : "");
  const [maxSizeMb, setMaxSizeMb] = useState(bytesToMb(rules.maxSizeBytes));
  const [counts, setCounts] = useState<CountRow[]>(rulesToCountRows(rules));
  const [altEnabled, setAltEnabled] = useState(rules.alternateOptions?.enabled ?? false);
  const [altOptions, setAltOptions] = useState<string[]>(rules.alternateOptions?.options ?? []);
  const [altDraft, setAltDraft] = useState("");
  const [linkEnabled, setLinkEnabled] = useState(rules.externalLinkFallback?.enabled ?? false);
  const [linkHelpText, setLinkHelpText] = useState(rules.externalLinkFallback?.helpText ?? "");

  function toggleFileType(type: FileTypeCategory) {
    setAllowedFileTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  function addCountRow() {
    const unused = FILE_TYPE_CATEGORIES.find((t) => !counts.some((c) => c.fileType === t));
    if (unused) setCounts((prev) => [...prev, { fileType: unused, min: "", max: "" }]);
  }

  function removeCountRow(index: number) {
    setCounts((prev) => prev.filter((_, i) => i !== index));
  }

  function addAltOption() {
    const trimmed = altDraft.trim();
    if (trimmed && !altOptions.includes(trimmed)) setAltOptions((prev) => [...prev, trimmed]);
    setAltDraft("");
  }

  function removeAltOption(option: string) {
    setAltOptions((prev) => prev.filter((o) => o !== option));
  }

  function save() {
    const nextRules: FolderRules = {};

    if (allowedFileTypes.length > 0) nextRules.allowedFileTypes = allowedFileTypes;

    const width = Number(minWidth);
    const height = Number(minHeight);
    if (minWidth.trim() !== "" && minHeight.trim() !== "" && width > 0 && height > 0) {
      nextRules.minResolution = { width, height };
    }

    const maxSizeBytes = mbToBytes(maxSizeMb);
    if (maxSizeBytes) nextRules.maxSizeBytes = maxSizeBytes;

    const countsObj: NonNullable<FolderRules["counts"]> = {};
    for (const row of counts) {
      const min = row.min.trim() !== "" ? Number(row.min) : undefined;
      const max = row.max.trim() !== "" ? Number(row.max) : undefined;
      if (min !== undefined || max !== undefined) countsObj[row.fileType] = { min, max };
    }
    if (Object.keys(countsObj).length > 0) nextRules.counts = countsObj;

    nextRules.alternateOptions = { enabled: altEnabled, options: altEnabled ? altOptions : [] };
    nextRules.externalLinkFallback = { enabled: linkEnabled, helpText: linkEnabled ? linkHelpText.trim() || undefined : undefined };

    startTransition(() => updateFolderTemplateRules(folderTemplateId, nextRules));
    setOpen(false);
  }

  return (
    <>
      <Button variant="text" size="inline" type="button" icon="tune" onClick={() => setOpen(true)}>
        Rules
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        headline={`Upload rules — ${folderName}`}
        className="w-[min(calc(100vw-3rem),36rem)] max-h-[85vh] overflow-y-auto"
        actions={
          <>
            <Button variant="text" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="filled" type="button" onClick={save}>
              Save rules
            </Button>
          </>
        }
      >
        <div className="space-y-6 text-left">
          <section className="space-y-2">
            <p className="type-label-large text-on-surface-variant">Allowed file types</p>
            <p className="type-body-small text-on-surface-variant">Leave all unchecked to accept any type.</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {FILE_TYPE_CATEGORIES.map((type) => (
                <CheckboxField
                  key={type}
                  label={type}
                  checked={allowedFileTypes.includes(type)}
                  onChange={() => toggleFileType(type)}
                  compact
                />
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="type-label-large text-on-surface-variant">Minimum resolution (images/video)</p>
            <div className="flex gap-2">
              <TextField type="number" min={0} placeholder="Width (px)" value={minWidth} onChange={(e) => setMinWidth(e.target.value)} compact />
              <TextField type="number" min={0} placeholder="Height (px)" value={minHeight} onChange={(e) => setMinHeight(e.target.value)} compact />
            </div>
          </section>

          <section className="space-y-2">
            <p className="type-label-large text-on-surface-variant">Maximum file size</p>
            <TextField type="number" min={0} step="0.1" placeholder="Max size (MB)" value={maxSizeMb} onChange={(e) => setMaxSizeMb(e.target.value)} compact />
          </section>

          <section className="space-y-2">
            <p className="type-label-large text-on-surface-variant">Per-type file counts</p>
            <div className="space-y-2">
              {counts.map((row, index) => (
                <div key={row.fileType} className="flex items-center gap-2">
                  <select
                    className="rounded-xs border border-outline bg-surface px-2 py-1 type-body-medium text-on-surface"
                    value={row.fileType}
                    onChange={(e) =>
                      setCounts((prev) => prev.map((r, i) => (i === index ? { ...r, fileType: e.target.value as FileTypeCategory } : r)))
                    }
                  >
                    {FILE_TYPE_CATEGORIES.map((type) => (
                      <option key={type} value={type} disabled={counts.some((c, i) => c.fileType === type && i !== index)}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <TextField
                    type="number"
                    min={0}
                    placeholder="Min"
                    compact
                    className="w-20"
                    value={row.min}
                    onChange={(e) => setCounts((prev) => prev.map((r, i) => (i === index ? { ...r, min: e.target.value } : r)))}
                  />
                  <TextField
                    type="number"
                    min={0}
                    placeholder="Max"
                    compact
                    className="w-20"
                    value={row.max}
                    onChange={(e) => setCounts((prev) => prev.map((r, i) => (i === index ? { ...r, max: e.target.value } : r)))}
                  />
                  <Button variant="text-error" size="inline" type="button" icon="delete" onClick={() => removeCountRow(index)}>
                    Remove
                  </Button>
                </div>
              ))}
              {counts.length < FILE_TYPE_CATEGORIES.length && (
                <Button variant="text" size="sm" type="button" icon="add" onClick={addCountRow}>
                  Add count rule
                </Button>
              )}
            </div>
          </section>

          <section className="space-y-2">
            <CheckboxField label="Accept alternate document types" checked={altEnabled} onChange={(e) => setAltEnabled(e.target.checked)} />
            {altEnabled && (
              <div className="space-y-2 pl-6">
                <p className="type-body-small text-on-surface-variant">e.g. this folder accepts either a Tender or a TOR document.</p>
                <div className="flex flex-wrap gap-2">
                  {altOptions.map((option) => (
                    <span key={option} className="flex items-center gap-1 rounded-full bg-secondary-container px-3 py-1 type-label-medium text-on-secondary-container">
                      {option}
                      <button type="button" aria-label={`Remove ${option}`} onClick={() => removeAltOption(option)}>
                        <Icon name="close" size={14} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <TextField
                    placeholder="e.g. Tender"
                    compact
                    className="flex-1"
                    value={altDraft}
                    onChange={(e) => setAltDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addAltOption();
                      }
                    }}
                  />
                  <Button variant="text" size="sm" type="button" onClick={addAltOption}>
                    Add
                  </Button>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-2">
            <CheckboxField label="Allow external link when a file is too large" checked={linkEnabled} onChange={(e) => setLinkEnabled(e.target.checked)} />
            {linkEnabled && (
              <div className="pl-6">
                <TextareaField
                  placeholder="Optional help text shown to the uploader"
                  rows={2}
                  value={linkHelpText}
                  onChange={(e) => setLinkHelpText(e.target.value)}
                />
              </div>
            )}
          </section>
        </div>
      </Dialog>
    </>
  );
}
