"use client";

import { useActionState } from "react";
import { updateWatermarkSettings, type WatermarkSettingsState } from "@/app/actions/security-settings";

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
    <form action={action} className="mt-6 space-y-3 rounded-md border border-slate-200 p-4">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="watermarkEnabled" defaultChecked={watermarkEnabled} />
        Enable watermark on image downloads and PDF report exports
      </label>

      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600">Watermark text</label>
        <input
          name="watermarkText"
          defaultValue={watermarkText ?? ""}
          placeholder={orgName}
          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
        />
        <p className="text-xs text-slate-400">Leave blank to use the organization name (&quot;{orgName}&quot;).</p>
      </div>

      {state?.message && <p className="text-sm text-red-600">{state.message}</p>}

      <button
        disabled={pending}
        type="submit"
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save settings"}
      </button>
    </form>
  );
}
