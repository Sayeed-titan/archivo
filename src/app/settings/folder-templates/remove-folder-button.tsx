"use client";

import { removeFolderTemplate } from "@/app/actions/folder-templates";

export function RemoveFolderButton({ folderTemplateId }: { folderTemplateId: string }) {
  return (
    <button
      onClick={() => removeFolderTemplate(folderTemplateId)}
      className="text-xs text-slate-400 hover:text-red-600"
    >
      remove
    </button>
  );
}
