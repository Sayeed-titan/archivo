"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { openInExternalEditor, openInEmbeddedEditor } from "@/app/actions/integrations";

// `mode="inline"` (default): bare text link used in the dense file-row
// metadata line — opens the provider's own editor UI in a new tab, same
// as before this file supported embedding.
// `mode="embed"`: used inside the file preview dialog, where there's room
// for an iframe — renders the editor directly in-app instead of leaving.
export function OpenInEditorButton({
  fileId,
  provider,
  mode = "inline",
  onEmbedStart,
  onEmbedEnd,
  placeholder,
}: {
  fileId: string;
  provider: string;
  mode?: "inline" | "embed";
  /** embed mode only: lets the parent dialog resize itself (e.g. go
   * near-fullscreen) once the editor iframe is actually showing. */
  onEmbedStart?: () => void;
  onEmbedEnd?: () => void;
  /** embed mode only: wraps the button/error/link-account states before
   * the editor loads (e.g. a "can't preview inline" message alongside the
   * button). Not shown once the iframe is up — that gets the full area. */
  placeholder?: React.ReactNode;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [needsGoogleAccount, setNeedsGoogleAccount] = useState(false);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  // Notifies the parent dialog so it can resize itself around the embed —
  // a genuine external-system signal (parent layout), not state being
  // synced/derived here, so an effect is the right tool, not a render-time
  // computation.
  useEffect(() => {
    if (embedUrl) {
      onEmbedStart?.();
      return () => onEmbedEnd?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedUrl]);

  if (embedUrl) {
    return (
      <iframe
        src={embedUrl}
        title={`Edit in ${provider === "google" ? "Google" : provider}`}
        className="h-full min-h-[70vh] w-full flex-1 rounded-sm border border-outline-variant"
      />
    );
  }

  const trigger = (
    <>
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            setNeedsGoogleAccount(false);
            try {
              if (mode === "embed") {
                const result = await openInEmbeddedEditor(fileId);
                if ("needsGoogleAccount" in result) {
                  setNeedsGoogleAccount(true);
                } else {
                  setEmbedUrl(result.embedUrl);
                }
              } else {
                const { openUrl } = await openInExternalEditor(fileId);
                window.open(openUrl, "_blank", "noopener,noreferrer");
              }
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to open file.");
            }
          })
        }
        className="text-primary underline hover:text-primary-hover disabled:opacity-50"
      >
        {isPending ? "Opening..." : `Open in ${provider === "google" ? "Google" : provider}`}
      </button>
      {error && <span className="text-error">{error}</span>}
      {needsGoogleAccount && (
        <p className="type-body-small text-on-surface-variant">
          Link your Google account at{" "}
          <Link href="/profile" className="text-primary underline">
            your profile
          </Link>{" "}
          first so this file can be shared with you for editing.
        </p>
      )}
    </>
  );

  if (!placeholder) return trigger;

  return (
    <>
      {placeholder}
      {trigger}
    </>
  );
}
