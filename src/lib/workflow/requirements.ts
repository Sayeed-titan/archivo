// Configurable transition requirements (HANDOFF.md point 7 / Prompt 7):
// what must be true about an archive before it can move to the next
// workflow state. Two kinds cover the SRS use cases without needing a
// general-purpose rule engine:
//   - mandatoryFoldersFilled: every Folder.isMandatory=true folder has
//     at least one non-deleted, latest-version file.
//   - fieldRequired: a specific Archive metadata column is non-empty.
// New kinds can be added here without a schema migration (requirements
// is stored as JSON on WorkflowTransition).

export type MandatoryFoldersRequirement = { kind: "mandatoryFoldersFilled" };
export type FieldRequiredRequirement = { kind: "fieldRequired"; field: string };

export type WorkflowRequirement = MandatoryFoldersRequirement | FieldRequiredRequirement;

const REQUIRABLE_FIELDS = [
  { key: "department", label: "Department" },
  { key: "eventDate", label: "Date" },
  { key: "venue", label: "Venue" },
  { key: "organizer", label: "Organizer" },
  { key: "coordinator", label: "Coordinator" },
  { key: "donor", label: "Donor" },
  { key: "projectName", label: "Project" },
  { key: "description", label: "Description" },
] as const;

export function getRequirableFields() {
  return REQUIRABLE_FIELDS;
}

export function isValidRequirement(r: unknown): r is WorkflowRequirement {
  if (typeof r !== "object" || r === null) return false;
  const candidate = r as Record<string, unknown>;
  if (candidate.kind === "mandatoryFoldersFilled") return true;
  if (candidate.kind === "fieldRequired") return typeof candidate.field === "string";
  return false;
}

export function parseRequirements(json: unknown): WorkflowRequirement[] {
  if (!Array.isArray(json)) return [];
  return json.filter(isValidRequirement);
}

export function describeRequirement(req: WorkflowRequirement): string {
  if (req.kind === "mandatoryFoldersFilled") return "All mandatory folders must have at least one file";
  const label = REQUIRABLE_FIELDS.find((f) => f.key === req.field)?.label ?? req.field;
  return `"${label}" must be filled in`;
}
