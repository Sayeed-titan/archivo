"use client";

import { useActionState } from "react";
import { updateEmailPreference, type EmailPreferenceState } from "@/app/actions/profile";
import { CheckboxField, Button, Card } from "@/components/ui";

export function EmailPreferenceForm({ emailNotificationsEnabled }: { emailNotificationsEnabled: boolean }) {
  const [, action, pending] = useActionState<EmailPreferenceState, FormData>(updateEmailPreference, undefined);

  return (
    <form action={action} className="mt-2">
      <Card>
        <CheckboxField
          name="emailNotificationsEnabled"
          defaultChecked={emailNotificationsEnabled}
          label="Email me for archive created, upload completed, review pending, and storage limit warnings"
        />
        <Button type="submit" loading={pending} loadingText="Saving..." className="mt-3">
          Save
        </Button>
      </Card>
    </form>
  );
}
