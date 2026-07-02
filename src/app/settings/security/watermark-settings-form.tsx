"use client";

import { useActionState } from "react";
import { updateWatermarkSettings, type WatermarkSettingsState } from "@/app/actions/security-settings";
import { CheckboxField, TextField, Button, Card } from "@/components/ui";

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

  return (
    <form action={action} className="mt-6">
      <Card className="space-y-3">
        <CheckboxField
          name="watermarkEnabled"
          defaultChecked={watermarkEnabled}
          label="Enable watermark on image downloads and PDF report exports"
        />

        <TextField
          name="watermarkText"
          label="Watermark text"
          defaultValue={watermarkText ?? ""}
          placeholder={orgName}
          compact
          hint={`Leave blank to use the organization name ("${orgName}").`}
        />

        {state?.message && <p className="text-sm text-red-600">{state.message}</p>}

        <Button type="submit" loading={pending} loadingText="Saving...">
          Save settings
        </Button>
      </Card>
    </form>
  );
}
