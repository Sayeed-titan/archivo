"use client";

import { useActionState, useState } from "react";
import { createShareLink, type CreateShareLinkState } from "@/app/actions/share-links";
import { Dialog, Button, TextField, Combobox, IconButton, useSnackbar } from "@/components/ui";
import { Icon } from "@/components/icon";

export function FileShareButton({ fileId, filename }: { fileId: string; filename: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CreateShareLinkState, FormData>(createShareLink, undefined);
  const { showSnackbar } = useSnackbar();

  const shareUrl = state?.token && typeof window !== "undefined" ? `${window.location.origin}/share/${state.token}` : null;

  function copyLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    showSnackbar("Link copied.");
  }

  return (
    <>
      <IconButton icon="share" label={`Share ${filename}`} variant="standard" onClick={() => setOpen(true)} />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        headline={shareUrl ? "Share link ready" : `Share "${filename}"`}
        actions={
          <Button variant="text" onClick={() => setOpen(false)}>
            Close
          </Button>
        }
      >
        {shareUrl ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TextField value={shareUrl} readOnly compact className="flex-1" />
              <IconButton icon="content_copy" label="Copy link" variant="outlined" onClick={copyLink} />
            </div>
            <p className="type-body-small text-on-surface-variant">
              Anyone with this link can download the file without signing in.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="tonal"
                icon="chat"
                href={`https://wa.me/?text=${encodeURIComponent(`${filename}: ${shareUrl}`)}`}
              >
                Share via WhatsApp
              </Button>
              <Button
                variant="tonal"
                icon="mail"
                href={`mailto:?subject=${encodeURIComponent(filename)}&body=${encodeURIComponent(shareUrl)}`}
              >
                Share via email
              </Button>
            </div>
          </div>
        ) : (
          <form action={action} className="space-y-3">
            <input type="hidden" name="fileId" value={fileId} />
            <Combobox
              name="expiresInDays"
              label="Link expires"
              defaultValue=""
              placeholder="Never"
              compact
              options={[
                { value: "1", label: "In 1 day" },
                { value: "7", label: "In 7 days" },
                { value: "30", label: "In 30 days" },
              ]}
            />
            <Combobox
              name="maxDownloads"
              label="Download limit"
              defaultValue=""
              placeholder="No limit"
              compact
              options={[
                { value: "1", label: "1 download" },
                { value: "5", label: "5 downloads" },
                { value: "10", label: "10 downloads" },
              ]}
            />
            {state?.message && (
              <p className="flex items-center gap-2 type-body-medium text-error">
                <Icon name="error" size={16} />
                {state.message}
              </p>
            )}
            <Button type="submit" loading={pending} loadingText="Generating…" icon="link" className="w-full">
              Generate link
            </Button>
          </form>
        )}
      </Dialog>
    </>
  );
}
