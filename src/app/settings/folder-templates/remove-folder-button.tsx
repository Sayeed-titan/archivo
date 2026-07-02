"use client";

import { removeFolderTemplate } from "@/app/actions/folder-templates";
import { Button } from "@/components/ui";

export function RemoveFolderButton({ folderTemplateId }: { folderTemplateId: string }) {
  return (
    <Button onClick={() => removeFolderTemplate(folderTemplateId)} variant="danger-ghost" size="inline">
      remove
    </Button>
  );
}
