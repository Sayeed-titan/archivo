"use client";

import { useActionState, useEffect } from "react";
import { updateWatermarkSettings, type WatermarkSettingsState } from "@/app/actions/security-settings";
import { SwitchField, TextField, Button, Card, useSnackbar } from "@/components/ui";

export function WatermarkSettingsForm({
  watermarkEnabled,
  watermarkText,
  orgName,
}: {
  watermarkEnabled: boolean;
  watermarkText: string | null;
  orgName: string;
}) {
  const [state, action, pending] = useActionState<WatermarkSettingsState, FormData>(updateWatermarkSettings, undefined);
  const { showSnackbar } = useSnackbar();

  // The action returns {} on success and { message } on failure.
  useEffect(() => {
    if (state && !state.message) showSnackbar("Watermark settings saved.");
  }, [state, showSnackbar]);

  return (
    <form action={action} className="mt-6">
      <Card className="space-y-4">
        <SwitchField
          name="watermarkEnabled"
          defaultChecked={watermarkEnabled}
          label="Watermark downloads"
          description="Applied to image downloads and PDF report exports. Stored files are never modified."
        />

        <TextField
          name="watermarkText"
          label="Watermark text"
          defaultValue={watermarkText ?? ""}
          placeholder={orgName}
          hint={`Leave blank to use the organization name ("${orgName}").`}
        />

        {state?.message && <p className="type-body-medium text-error">{state.message}</p>}

        <Button type="submit" loading={pending} loadingText="Saving…">
          Save settings
        </Button>
      </Card>
    </form>
  );
}
