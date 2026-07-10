"use client";

import { useActionState, useEffect, useState } from "react";
import { updateFileNamingTemplate, type FileNamingState } from "@/app/actions/security-settings";
import { NAMING_TOKENS, DEFAULT_NAMING_TEMPLATE, previewFileName } from "@/lib/file-naming";
import { TextField, Button, Card, useSnackbar } from "@/components/ui";
import { Icon } from "@/components/icon";

export function FileNamingForm({ template }: { template: string }) {
  const [state, action, pending] = useActionState<FileNamingState, FormData>(updateFileNamingTemplate, undefined);
  const { showSnackbar } = useSnackbar();
  const [value, setValue] = useState(template);
  const [caret, setCaret] = useState(template.length);

  useEffect(() => {
    if (state && !state.message) showSnackbar("File naming template saved.");
  }, [state, showSnackbar]);

  // Inserts at the last known cursor position (tracked via onSelect below)
  // rather than always appending, so a token can be dropped in the middle
  // of an existing template without retyping it.
  function insertToken(token: string) {
    setValue((v) => {
      const pos = Math.min(caret, v.length);
      const next = v.slice(0, pos) + token + v.slice(pos);
      setCaret(pos + token.length);
      return next;
    });
  }

  let preview = "";
  let previewError: string | null = null;
  try {
    preview = previewFileName(value);
  } catch {
    previewError = "Couldn't preview this template.";
  }

  return (
    <form action={action} className="mt-6">
      <Card className="space-y-4">
        <TextField
          name="template"
          label="Naming template"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setCaret(e.target.selectionStart ?? e.target.value.length);
          }}
          onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? value.length)}
          hint="Click a token below to insert it at the cursor. Any text you type between tokens (like _) is kept as-is."
          error={state?.message}
        />

        <div>
          <p className="type-label-large text-on-surface-variant">Tokens</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {NAMING_TOKENS.map((t) => (
              <button
                key={t.token}
                type="button"
                title={t.description}
                onClick={() => insertToken(t.token)}
                className="flex items-center gap-1 rounded-full border border-outline bg-surface px-3 py-1.5 type-label-medium text-on-surface transition-colors hover:bg-primary-container hover:text-on-primary-container"
              >
                <Icon name="add" size={14} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-sm border border-outline-variant bg-surface-container-low p-3">
          <p className="type-label-large text-on-surface-variant">Preview</p>
          {previewError ? (
            <p className="mt-1 type-body-medium text-error">{previewError}</p>
          ) : (
            <p className="mt-1 break-all font-mono type-body-medium text-on-surface">{preview}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" loading={pending} loadingText="Saving…" icon="save">
            Save template
          </Button>
          <Button type="button" variant="text" onClick={() => setValue(DEFAULT_NAMING_TEMPLATE)}>
            Reset to default
          </Button>
        </div>
      </Card>
    </form>
  );
}
