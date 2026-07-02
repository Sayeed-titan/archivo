"use client";

import { useState, useTransition } from "react";
import { openInExternalEditor } from "@/app/actions/integrations";

export function OpenInEditorButton({ fileId, provider }: { fileId: string; provider: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              const { openUrl } = await openInExternalEditor(fileId);
              window.open(openUrl, "_blank", "noopener,noreferrer");
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
    </>
  );
}
