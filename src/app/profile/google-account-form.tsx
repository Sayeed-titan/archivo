"use client";

import { useActionState } from "react";
import { updateGoogleEmail, type GoogleEmailState } from "@/app/actions/profile";
import { TextField, Button, Card } from "@/components/ui";

export function GoogleAccountForm({ googleEmail }: { googleEmail: string | null }) {
  const [state, action, pending] = useActionState<GoogleEmailState, FormData>(updateGoogleEmail, undefined);

  return (
    <form action={action} className="mt-2">
      <Card className="space-y-4">
        <TextField
          name="googleEmail"
          type="email"
          label="Your Google account email"
          defaultValue={googleEmail ?? ""}
          placeholder="you@gmail.com"
          error={state?.message}
          hint="Needed to edit Word/Excel/PowerPoint files embedded from Google Drive — the file is shared with this address so edits are attributed to you, not the organization's shared connector account."
        />
        {state?.success && <p className="type-body-small text-on-surface-variant">Saved.</p>}
        <Button type="submit" loading={pending} loadingText="Saving…">
          Save
        </Button>
      </Card>
    </form>
  );
}
