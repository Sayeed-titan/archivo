"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { Badge, Menu, MenuItem, MenuSeparator, CheckboxField } from "@/components/ui";
import { toggleFolderMandatory } from "@/app/actions/folder-templates";
import { RenameFolderForm } from "./rename-folder-form";
import { RemoveFolderButton } from "./remove-folder-button";
import { FolderRulesEditor } from "./folder-rules-editor";
import type { FolderRules } from "@/lib/folder-rules";

type FolderTemplateItem = { id: string; name: string; isMandatory: boolean; rules: FolderRules };

// File-explorer-style tile for one folder template — same visual language
// as the archive explorer's FolderTile (icon + label + a "⋮" menu that
// doesn't fight the tile's own click target), but there's no deeper level
// to open into (a folder template has no children), so the tile itself
// isn't a navigation trigger — actions live entirely in the menu/inline
// controls instead of an onOpen handler.
export function FolderTemplateTile({ folder, canManage }: { folder: FolderTemplateItem; canManage: boolean }) {
  const [renaming, setRenaming] = useState(false);
  const [mandatory, setMandatory] = useState(folder.isMandatory);
  const [, startTransition] = useTransition();

  if (renaming) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-outline-variant p-3">
        <Icon name="folder" size={48} className="text-on-surface-variant" />
        <RenameFolderForm
          folderTemplateId={folder.id}
          name={folder.name}
          isMandatory={folder.isMandatory}
          onDone={() => setRenaming(false)}
        />
      </div>
    );
  }

  return (
    <div className="group relative flex flex-col items-center gap-2 rounded-md border border-transparent p-3 text-center transition-colors hover:border-outline-variant hover:bg-on-surface-8">
      {canManage && (
        <div className="absolute right-1.5 top-1.5">
          <Menu
            trigger={({ toggle }) => (
              <button
                type="button"
                onClick={toggle}
                aria-label={`Options for ${folder.name}`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-on-surface-variant opacity-0 transition-opacity hover:bg-on-surface-8 group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Icon name="more_vert" size={18} />
              </button>
            )}
          >
            <MenuItem icon="edit_square" onClick={() => setRenaming(true)}>
              Edit
            </MenuItem>
            <MenuSeparator />
            <div className="px-3 py-1.5">
              <CheckboxField
                label="Required"
                compact
                checked={mandatory}
                onChange={(e) => {
                  const next = e.target.checked;
                  setMandatory(next);
                  startTransition(() => toggleFolderMandatory(folder.id, next));
                }}
              />
            </div>
            <MenuSeparator />
            <div className="px-3 py-1.5">
              <FolderRulesEditor folderTemplateId={folder.id} folderName={folder.name} rules={folder.rules} />
            </div>
            <MenuSeparator />
            <div className="px-3 py-1.5">
              <RemoveFolderButton folderTemplateId={folder.id} />
            </div>
          </Menu>
        </div>
      )}
      <Icon name="folder" size={56} className="text-on-surface-variant" />
      <span className="line-clamp-2 w-full wrap-break-word type-label-large text-on-surface">{folder.name}</span>
      {mandatory && (
        <Badge tone="warning" pill={false}>
          required
        </Badge>
      )}
    </div>
  );
}
