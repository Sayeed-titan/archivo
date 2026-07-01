// Report field catalog (HANDOFF.md point 4): every field a saved
// ReportTemplate can select as a column. Raw fields map straight to an
// Archive column; computed fields are derived per-archive after the base
// query runs (file counts, storage size, missing-folder status, etc.) —
// see execute.ts. Keeping this as a single catalog (not per-report pages)
// is what lets the 7 SRS reports and any custom report share one engine.

export type ReportFieldType = "text" | "number" | "date" | "select";

export type ReportFieldDef = {
  key: string;
  label: string;
  type: ReportFieldType;
  kind: "raw" | "computed";
  options?: string[]; // for type: "select"
};

export const REPORT_FIELDS: ReportFieldDef[] = [
  { key: "archiveNumber", label: "Archive ID", type: "text", kind: "raw" },
  { key: "name", label: "Event/Program Name", type: "text", kind: "raw" },
  { key: "category", label: "Category", type: "text", kind: "raw" },
  { key: "department", label: "Department", type: "text", kind: "raw" },
  { key: "eventDate", label: "Date", type: "date", kind: "raw" },
  { key: "venue", label: "Venue", type: "text", kind: "raw" },
  { key: "organizer", label: "Organizer", type: "text", kind: "raw" },
  { key: "coordinator", label: "Coordinator", type: "text", kind: "raw" },
  { key: "donor", label: "Donor", type: "text", kind: "raw" },
  { key: "projectName", label: "Project", type: "text", kind: "raw" },
  {
    key: "status",
    label: "Status",
    type: "select",
    kind: "raw",
    options: ["Draft", "Pending Review", "Archived"],
  },
  { key: "createdByName", label: "Created By", type: "text", kind: "computed" },
  { key: "createdAt", label: "Created At", type: "date", kind: "raw" },
  { key: "updatedAt", label: "Last Updated", type: "date", kind: "raw" },
  { key: "fileCount", label: "Document Count", type: "number", kind: "computed" },
  { key: "storageBytes", label: "Storage Used (bytes)", type: "number", kind: "computed" },
  { key: "missingMandatoryFolders", label: "Missing Mandatory Folders", type: "number", kind: "computed" },
  { key: "downloadCount", label: "Download Count", type: "number", kind: "computed" },
];

export function getFieldDef(key: string): ReportFieldDef | undefined {
  return REPORT_FIELDS.find((f) => f.key === key);
}
