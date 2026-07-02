"use client";

import { useActionState } from "react";
import { updateEmailPreference, type EmailPreferenceState } from "@/app/actions/profile";

export function EmailPreferenceForm({ emailNotificationsEnabled }: { emailNotificationsEnabled: boolean }) {
  const [, action, pending] = useActionState<EmailPreferenceState, FormData>(updateEmailPreference, undefined);

  return (
    <form action={action} className="mt-2 rounded-md border border-slate-200 p-4">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="emailNotificationsEnabled" defaultChecked={emailNotificationsEnabled} />
        Email me for archive created, upload completed, review pending, and storage limit warnings
      </label>
      <button
        disabled={pending}
        type="submit"
        className="mt-3 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
