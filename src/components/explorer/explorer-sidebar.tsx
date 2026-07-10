"use client";

import { Icon } from "@/components/icon";
import { cn } from "@/lib/cn";
import { folderIconClassName } from "@/lib/folder-colors";
import type { ExplorerFolder } from "./types";

// Desktop-file-explorer-style folder rail: archive root + a flat list of
// its folders (this app's Folder model has no parentFolderId, so there's
// no deeper nesting to render — see the schema comment on Folder). The
// whole panel collapses to a thin icon strip via `collapsed`, matching how
// Explorer/Finder's own sidebar can be hidden without losing your place.
export function ExplorerSidebar({
  archiveName,
  folders,
  currentFolderId,
  onNavigate,
  collapsed,
  onToggleCollapsed,
}: {
  archiveName: string;
  folders: ExplorerFolder[];
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  if (collapsed) {
    return (
      <div className="flex w-10 shrink-0 flex-col items-center border-r border-outline-variant/60 bg-surface-container-low py-2">
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label="Expand folder sidebar"
          title="Expand folder sidebar"
          className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-on-surface-8"
        >
          <Icon name="dock_to_right" size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-56 shrink-0 border-r border-outline-variant/60 bg-surface-container-low">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="type-label-medium text-on-surface-variant">Folders</span>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label="Collapse folder sidebar"
          title="Collapse folder sidebar"
          className="flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant hover:bg-on-surface-8"
        >
          <Icon name="dock_to_left" size={16} />
        </button>
      </div>
      <nav className="max-h-[32rem] overflow-y-auto pb-2">
        <SidebarRow
          label={archiveName}
          icon="folder_open"
          iconClassName="text-primary"
          active={currentFolderId === null}
          onClick={() => onNavigate(null)}
        />
        <div className="ml-3 border-l border-outline-variant/60 pl-1">
          {folders.map((folder) => (
            <SidebarRow
              key={folder.id}
              label={folder.name}
              icon={folder.files.length === 0 ? "folder_open" : "folder"}
              iconClassName={folderIconClassName(folder.color)}
              active={currentFolderId === folder.id}
              onClick={() => onNavigate(folder.id)}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}

function SidebarRow({
  label,
  icon,
  iconClassName,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  iconClassName: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-xs px-2.5 py-1.5 text-left type-body-medium transition-colors hover:bg-on-surface-8",
        active ? "bg-secondary-container text-on-secondary-container" : "text-on-surface"
      )}
    >
      <Icon name={icon} size={18} className={cn("shrink-0", active ? "text-on-secondary-container" : iconClassName)} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}
