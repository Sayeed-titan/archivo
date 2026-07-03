// Human-readable labels for the 10 Role permission flags, shared between
// the role-edit form and the create-role form so both stay in sync.
export const PERMISSION_LABELS: { key: string; label: string }[] = [
  { key: "canCreateArchive", label: "Create archives" },
  { key: "canUpload", label: "Upload files" },
  { key: "canEditMetadata", label: "Edit metadata & change status" },
  { key: "canDeleteArchive", label: "Delete archives (recoverable)" },
  { key: "canHardDelete", label: "Permanently delete archives" },
  { key: "canManageUsers", label: "Manage users & view audit trail" },
  { key: "canManageSettings", label: "Manage organization settings" },
  { key: "canGenerateReport", label: "Generate & export reports" },
  { key: "canViewAll", label: "View all archives (not just own/department)" },
  { key: "canDownload", label: "Download files" },
];
