"use client";

import { useActionState } from "react";
import { updateArchiveMetadata, type UpdateMetadataState } from "@/app/actions/archives";
import type { Archive } from "@/generated/prisma/client";

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
    <form action={action} className="mt-2 space-y-3 rounded-md border border-slate-200 p-4">
      <input type="hidden" name="archiveId" value={archive.id} />

      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600">Name</label>
        <input
          name="name"
          defaultValue={archive.name}
          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
        />
        {state?.errors?.name && <p className="text-sm text-red-600">{state.errors.name[0]}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Department</label>
          <input
            name="department"
            defaultValue={archive.department ?? ""}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Venue</label>
          <input
            name="venue"
            defaultValue={archive.venue ?? ""}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Organizer</label>
          <input
            name="organizer"
            defaultValue={archive.organizer ?? ""}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Coordinator</label>
          <input
            name="coordinator"
            defaultValue={archive.coordinator ?? ""}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Donor</label>
          <select
            name="donor"
            defaultValue={archive.donor ?? ""}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          >
            <option value="">—</option>
            {donors.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Project</label>
          <select
            name="projectName"
            defaultValue={archive.projectName ?? ""}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          >
            <option value="">—</option>
            {projects.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600">Status</label>
        <select
          name="status"
          defaultValue={archive.status}
          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="Draft">Draft</option>
          <option value="Pending Review">Pending Review</option>
          <option value="Archived">Archived</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-600">Description</label>
        <textarea
          name="description"
          defaultValue={archive.description ?? ""}
          rows={3}
          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
        />
      </div>

      {state?.message && <p className="text-sm text-red-600">{state.message}</p>}

      <button
        disabled={pending}
        type="submit"
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save metadata"}
      </button>
    </form>
  );
}
