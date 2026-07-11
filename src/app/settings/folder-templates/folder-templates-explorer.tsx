"use client";

import { useFolderNavigation } from "@/components/explorer/use-folder-navigation";
import { CategoryExplorerSidebar } from "./category-explorer-sidebar";
import { FolderTemplateTile } from "./folder-template-tile";
import { AddFolderForm } from "./add-folder-form";
import { Icon } from "@/components/icon";
import { IconButton, EmptyState } from "@/components/ui";
import type { FolderRules } from "@/lib/folder-rules";

type FolderTemplateItem = { id: string; name: string; isMandatory: boolean; rules: FolderRules };
type CategoryItem = { id: string; name: string; folderTemplates: FolderTemplateItem[] };

// File-explorer-style view for browsing folder templates: a sidebar lists
// every category (like the archive explorer's folder rail), clicking one
// opens it in the main pane as a tile grid of its folder templates — same
// "folder under folder" structure as /archives/[id]'s file explorer, one
// level deep (category -> folder templates), reusing the same navigation
// hook. Reordering/renaming a folder's position isn't available here
// (tiles have no natural drag order) — that's what the accordion Folders
// view is for; this view is for browsing/reviewing structure quickly.
export function FolderTemplatesExplorer({ categories, canManage }: { categories: CategoryItem[]; canManage: boolean }) {
  const { currentFolderId: currentCategoryId, navigate, back, forward, canGoBack, canGoForward } = useFolderNavigation();

  const openCategory = categories.find((c) => c.id === currentCategoryId) ?? null;

  return (
    <div className="flex overflow-hidden rounded-md border border-outline-variant bg-surface">
      <CategoryExplorerSidebar
        categories={categories.map((c) => ({ id: c.id, name: c.name, folderCount: c.folderTemplates.length }))}
        currentCategoryId={currentCategoryId}
        onNavigate={navigate}
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/60 bg-surface-container-low px-4 py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <IconButton
              icon="arrow_back"
              label="Back"
              size={18}
              disabled={!canGoBack}
              onClick={back}
              className="disabled:opacity-30"
            />
            <IconButton
              icon="arrow_forward"
              label="Forward"
              size={18}
              disabled={!canGoForward}
              onClick={forward}
              className="disabled:opacity-30"
            />
            <nav className="ml-1 flex min-w-0 items-center gap-1.5 type-title-medium text-on-surface">
              <button
                type="button"
                onClick={() => navigate(null)}
                className={
                  openCategory
                    ? "flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface"
                    : "flex items-center gap-1.5"
                }
              >
                <Icon name="folder_open" size={20} className={openCategory ? "text-on-surface-variant" : "text-primary"} />
                <span className="truncate">Categories</span>
              </button>
              {openCategory && (
                <>
                  <Icon name="chevron_right" size={18} className="shrink-0 text-on-surface-variant" />
                  <span className="truncate">{openCategory.name}</span>
                </>
              )}
            </nav>
          </div>
        </div>

        <div className="p-3">
          {!openCategory ? (
            categories.length === 0 ? (
              <p className="p-4 type-body-medium text-on-surface-variant">No categories yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => navigate(category.id)}
                    className="flex flex-col items-center gap-2 rounded-md border border-transparent p-3 text-center transition-colors hover:border-outline-variant hover:bg-on-surface-8"
                  >
                    <Icon name="folder" size={56} className="text-primary" />
                    <span className="line-clamp-2 w-full wrap-break-word type-label-large text-on-surface">
                      {category.name}
                    </span>
                    <span className="type-label-small text-on-surface-variant">
                      {category.folderTemplates.length} {category.folderTemplates.length === 1 ? "folder" : "folders"}
                    </span>
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-3">
              {openCategory.folderTemplates.length === 0 ? (
                <EmptyState icon="folder_off" title="No folders yet" description="Add the first folder template below." />
              ) : (
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {openCategory.folderTemplates.map((folder) => (
                    <FolderTemplateTile key={folder.id} folder={folder} canManage={canManage} />
                  ))}
                </div>
              )}
              {canManage && <AddFolderForm categoryId={openCategory.id} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
