"use client";

import { useActionState } from "react";
import { updateArchiveMetadata, type UpdateMetadataState } from "@/app/actions/archives";
import type { Archive } from "@/generated/prisma/client";
import { TextField, Combobox, TextareaField, Button, Card } from "@/components/ui";

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
          <Combobox
            name="donor"
            label="Donor"
            defaultValue={archive.donor ?? ""}
            compact
            placeholder="—"
            options={donors.map((d) => ({ value: d, label: d }))}
          />
          <Combobox
            name="projectName"
            label="Project"
            defaultValue={archive.projectName ?? ""}
            compact
            placeholder="—"
            options={projects.map((p) => ({ value: p, label: p }))}
          />
        </div>

        <TextareaField
          name="description"
          label="Description"
          defaultValue={archive.description ?? ""}
          rows={3}
        />

        {state?.message && <p className="type-body-medium text-error">{state.message}</p>}

        <Button type="submit" loading={pending} loadingText="Saving…" icon="save">
          Save metadata
        </Button>
      </Card>
    </form>
  );
}
