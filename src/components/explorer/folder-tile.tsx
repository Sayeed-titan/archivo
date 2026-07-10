"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { Badge, Menu, MenuItem, MenuSeparator } from "@/components/ui";
import { cn } from "@/lib/cn";
import { folderIconClassName } from "@/lib/folder-colors";
import { FolderColorMenu } from "./folder-color-menu";
import { RenameDialog } from "./rename-dialog";
import { renameFolder } from "@/app/actions/explorer";
import type { ExplorerFolder } from "./types";

export function FolderTile({
  folder,
  view,
  canEditMetadata,
  canManageAccess,
  archiveId,
  onOpen,
}: {
  folder: ExplorerFolder;
  view: "grid" | "list" | "details";
  canEditMetadata: boolean;
  canManageAccess: boolean;
  archiveId: string;
  onOpen: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const iconClass = folderIconClassName(folder.color);
  const isEmpty = folder.files.length === 0;
  const showMenu = canEditMetadata || canManageAccess;

  const menu = showMenu && (
    <Menu
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          aria-label={`Options for ${folder.name}`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-on-surface-variant opacity-0 transition-opacity hover:bg-on-surface-8 group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Icon name="more_vert" size={18} />
        </button>
      )}
    >
      {canEditMetadata && (
        <MenuItem icon="edit" onClick={() => setRenaming(true)}>
          Rename
        </MenuItem>
      )}
      {canEditMetadata && (
        <>
          <MenuSeparator />
          <p className="px-3 pb-1 type-label-medium text-on-surface-variant">Color</p>
          <FolderColorMenu folderId={folder.id} current={folder.color} />
        </>
      )}
      {canManageAccess && (
        <>
          <MenuSeparator />
          <MenuItem icon="admin_panel_settings" href={`/archives/${archiveId}/access`}>
            Manage access
          </MenuItem>
        </>
      )}
    </Menu>
  );

  if (view === "grid") {
    return (
      <>
        {/* Not a <button> — it wraps the "⋮" menu trigger, which must be a
            real <button>, and <button> cannot contain <button> (invalid
            HTML, hydration error). role="button" + onKeyDown keeps it
            keyboard-operable instead. */}
        <div
          role="button"
          tabIndex={0}
          onClick={onOpen}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpen();
            }
          }}
          className="group relative flex cursor-pointer flex-col items-center gap-2 rounded-md border border-transparent p-3 text-center transition-colors hover:border-outline-variant hover:bg-on-surface-8"
        >
          {/* stopPropagation at this boundary, not just on the trigger
              button — every click inside the menu (including a color
              swatch pick, which itself calls onClose but doesn't stop the
              DOM event) would otherwise keep bubbling up into this tile's
              own onClick={onOpen} and navigate into the folder. */}
          <div className="absolute right-1.5 top-1.5" onClick={(e) => e.stopPropagation()}>
            {menu}
          </div>
          <Icon name={isEmpty ? "folder_open" : "folder"} size={56} className={iconClass} />
          <span className="line-clamp-2 w-full wrap-break-word type-label-large text-on-surface">{folder.name}</span>
          <span className="flex items-center gap-1.5">
            {folder.isMandatory && (
              <Badge tone="warning" pill={false}>
                required
              </Badge>
            )}
            <span className="type-label-small text-on-surface-variant">{folder.files.length} files</span>
          </span>
        </div>
        {renaming && (
          <RenameDialog
            open={renaming}
            onClose={() => setRenaming(false)}
            title="Rename folder"
            currentName={folder.name}
            hiddenFieldName="folderId"
            hiddenFieldValue={folder.id}
            action={renameFolder}
          />
        )}
      </>
    );
  }

  // list / details: a compact row, details adds size/mandatory columns.
  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        className="group flex w-full cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 text-left transition-colors hover:bg-on-surface-8"
      >
        <Icon name={isEmpty ? "folder_open" : "folder"} size={22} className={cn("shrink-0", iconClass)} />
        <span className="min-w-0 flex-1 truncate type-body-large text-on-surface">{folder.name}</span>
        {folder.isMandatory && (
          <Badge tone="warning" pill={false}>
            required
          </Badge>
        )}
        <span className="w-20 shrink-0 text-right type-body-small text-on-surface-variant">
          {folder.files.length} {folder.files.length === 1 ? "file" : "files"}
        </span>
        <div onClick={(e) => e.stopPropagation()}>{menu}</div>
      </div>
      {renaming && (
        <RenameDialog
          open={renaming}
          onClose={() => setRenaming(false)}
          title="Rename folder"
          currentName={folder.name}
          hiddenFieldName="folderId"
          hiddenFieldValue={folder.id}
          action={renameFolder}
        />
      )}
    </>
  );
}
