"use client";

import { useActionState } from "react";
import { updateEmailPreference, type EmailPreferenceState } from "@/app/actions/profile";
import { SwitchField, Button, Card } from "@/components/ui";

export function EmailPreferenceForm({ emailNotificationsEnabled }: { emailNotificationsEnabled: boolean }) {
  const [, action, pending] = useActionState<EmailPreferenceState, FormData>(updateEmailPreference, undefined);

  return (
    <form action={action} className="mt-2">
      <Card className="space-y-4">
        <SwitchField
          name="emailNotificationsEnabled"
          defaultChecked={emailNotificationsEnabled}
          label="Email notifications"
          description="Archive created, upload completed, review pending, and storage limit warnings. In-app notifications always stay on."
        />
        <Button type="submit" loading={pending} loadingText="Saving…">
          Save
        </Button>
      </Card>
    </form>
  );
}
