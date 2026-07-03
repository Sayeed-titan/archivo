"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadAvatar, type AvatarUploadState } from "@/app/actions/profile";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";

export function AvatarUploadForm({ hasAvatar }: { hasAvatar: boolean }) {
  const [state, action, pending] = useActionState<AvatarUploadState, FormData>(uploadAvatar, undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const wasPending = useRef(false);

  // The action revalidates the layout (avatar shows in the top bar too);
  // refresh this page specifically once the upload settles so its own
  // <img> picks up the new file immediately.
  useEffect(() => {
    if (wasPending.current && !pending) router.refresh();
    wasPending.current = pending;
  }, [pending, router]);

  return (
    <form action={action} className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        name="avatar"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={() => inputRef.current?.form?.requestSubmit()}
      />
      <Button
        type="button"
        variant="outlined"
        size="sm"
        icon="photo_camera"
        onClick={() => inputRef.current?.click()}
        loading={pending}
        loadingText="Uploading…"
      >
        {hasAvatar ? "Change photo" : "Upload photo"}
      </Button>
      {state?.message && (
        <span className="flex items-center gap-1 type-body-small text-error">
          <Icon name="error" size={14} />
          {state.message}
        </span>
      )}
    </form>
  );
}
