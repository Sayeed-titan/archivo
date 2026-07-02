// Ordered so parents are backed up/restored before the children that
// reference them via foreign keys — restore must insert in this order,
// backup can technically run in any order but matches it for clarity.
export const BACKUP_MODEL_ORDER = [
  "organization",
  "role",
  "category",
  "lookupList",
  "user",
  "workflowState",
  "workflowTransition",
  "reportTemplate",
  "orgIntegration",
  "lookupListItem",
  "folderTemplate",
  "customFieldDefinition",
  "archive",
  "folder",
  "file",
  "externalDocLink",
  "fileDownload",
  "auditLog",
  "notification",
] as const;

export type BackupModelName = (typeof BACKUP_MODEL_ORDER)[number];
