"use client";

import { useState, useTransition } from "react";
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
}: {
  fileId: string;
  provider: string;
  mode?: "inline" | "embed";
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [needsGoogleAccount, setNeedsGoogleAccount] = useState(false);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  if (embedUrl) {
    return (
      <iframe
        src={embedUrl}
        title={`Edit in ${provider === "google" ? "Google" : provider}`}
        className="h-[70vh] w-full rounded-sm border border-outline-variant"
      />
    );
  }

  return (
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
}
