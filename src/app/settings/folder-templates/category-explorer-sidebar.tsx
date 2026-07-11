"use client";

import { Icon } from "@/components/icon";
import { cn } from "@/lib/cn";

type CategoryItem = { id: string; name: string; folderCount: number };

// Same rail pattern as the archive file explorer's ExplorerSidebar
// (src/components/explorer/explorer-sidebar.tsx): a flat list here since
// categories, like Folder, have no nested parent/child structure — one
// level of "folder under folder" (category -> its folder templates) is
// exactly what this whole view exists to show, not a deeper tree.
export function CategoryExplorerSidebar({
  categories,
  currentCategoryId,
  onNavigate,
}: {
  categories: CategoryItem[];
  currentCategoryId: string | null;
  onNavigate: (categoryId: string | null) => void;
}) {
  return (
    <div className="w-56 shrink-0 border-r border-outline-variant/60 bg-surface-container-low">
      <div className="px-3 py-2">
        <span className="type-label-medium text-on-surface-variant">Categories</span>
      </div>
      <nav className="max-h-[36rem] overflow-y-auto pb-2">
        {categories.map((category) => (
          <SidebarRow
            key={category.id}
            label={category.name}
            count={category.folderCount}
            active={currentCategoryId === category.id}
            onClick={() => onNavigate(category.id)}
          />
        ))}
      </nav>
    </div>
  );
}

function SidebarRow({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left type-body-medium transition-colors hover:bg-on-surface-8",
        active ? "bg-secondary-container text-on-secondary-container" : "text-on-surface"
      )}
    >
      <Icon name={active ? "folder_open" : "folder"} size={18} className={cn("shrink-0", active ? "text-on-secondary-container" : "text-on-surface-variant")} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className={cn("type-label-small shrink-0", active ? "text-on-secondary-container" : "text-on-surface-variant")}>
        {count}
      </span>
    </button>
  );
}
