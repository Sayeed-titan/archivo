"use client";

import { useActionState } from "react";
import { updateArchiveMetadata, type UpdateMetadataState } from "@/app/actions/archives";
import type { Archive } from "@/generated/prisma/client";
import { TextField, SelectField, TextareaField, Button, Card } from "@/components/ui";

export function MetadataForm({
  archive,
  donors,
  projects,
}: {
  archive: Archive;
  donors: string[];
  projects: string[];
}) {
  const [state, action, pending] = useActionState<UpdateMetadataState, FormData>(updateArchiveMetadata, undefined);

  return (
    <form action={action} className="mt-2">
      <Card className="space-y-3">
        <input type="hidden" name="archiveId" value={archive.id} />

        <TextField
          name="name"
          label="Name"
          defaultValue={archive.name}
          compact
          error={state?.errors?.name?.[0]}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField name="department" label="Department" defaultValue={archive.department ?? ""} compact />
          <TextField name="venue" label="Venue" defaultValue={archive.venue ?? ""} compact />
          <TextField name="organizer" label="Organizer" defaultValue={archive.organizer ?? ""} compact />
          <TextField name="coordinator" label="Coordinator" defaultValue={archive.coordinator ?? ""} compact />
          <SelectField name="donor" label="Donor" defaultValue={archive.donor ?? ""} compact>
            <option value="">—</option>
            {donors.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </SelectField>
          <SelectField name="projectName" label="Project" defaultValue={archive.projectName ?? ""} compact>
            <option value="">—</option>
            {projects.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </SelectField>
        </div>

        <TextareaField
          name="description"
          label="Description"
          defaultValue={archive.description ?? ""}
          rows={3}
        />

        {state?.message && <p className="text-sm text-red-600">{state.message}</p>}

        <Button type="submit" loading={pending} loadingText="Saving...">
          Save metadata
        </Button>
      </Card>
    </form>
  );
}
