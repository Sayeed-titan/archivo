"use client";

import { useActionState, useEffect } from "react";
import { updateOrganizationSettings, type OrganizationSettingsState } from "@/app/actions/organization";
import { Button, TextField, useSnackbar } from "@/components/ui";

export function OrgSettingsForm({
  initial,
}: {
  initial: { name: string; industry: string; storageQuotaGb: string };
}) {
  const [state, formAction, pending] = useActionState<OrganizationSettingsState, FormData>(
    updateOrganizationSettings,
    undefined
  );
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    if (state?.status === "success") showSnackbar(state.message);
  }, [state, showSnackbar]);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <TextField id="org-name" name="name" label="Organization name" defaultValue={initial.name} required maxLength={200} />
      <TextField
        id="org-industry"
        name="industry"
        label="Industry"
        defaultValue={initial.industry}
        placeholder="e.g. ngo, healthcare, education"
        hint="Informational only — it never changes how the product behaves."
      />
      <TextField
        id="org-quota"
        name="storageQuotaGb"
        label="Storage quota (GB)"
        type="number"
        min="0.1"
        step="0.1"
        defaultValue={initial.storageQuotaGb}
        placeholder="Leave empty for no limit"
        hint="Administrators get notified at 80% usage. Clear the field to remove the limit."
      />
      {state?.status === "error" && <p className="type-body-medium text-error">{state.message}</p>}
      <Button type="submit" loading={pending} loadingText="Saving…">
        Save changes
      </Button>
    </form>
  );
}
