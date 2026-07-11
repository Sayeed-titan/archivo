"use client";

import { useState } from "react";
import { deleteCategory } from "@/app/actions/categories";
import { RenameCategoryForm } from "./rename-category-form";
import { AddFolderForm } from "./add-folder-form";
import { FolderTemplateList } from "./folder-template-list";
import type { FolderRules } from "@/lib/folder-rules";
import { Card, Button, Dialog, useSnackbar } from "@/components/ui";
import { Icon } from "@/components/icon";

type FolderTemplateItem = { id: string; name: string; isMandatory: boolean; rules: FolderRules };
type CategoryItem = { id: string; name: string; folderTemplates: FolderTemplateItem[] };

function DeleteCategoryButton({ categoryId, categoryName }: { categoryId: string; categoryName: string }) {
  const [open, setOpen] = useState(false);
  const { showSnackbar } = useSnackbar();

  return (
    <>
      <Button
        type="button"
        variant="text-error"
        size="inline"
        icon="delete"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        Delete
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        icon="warning"
        headline={`Delete "${categoryName}"?`}
        actions={
          <>
            <Button variant="text" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="text-error"
              type="button"
              onClick={async () => {
                setOpen(false);
                const result = await deleteCategory(categoryId);
                if (result?.message) showSnackbar(result.message);
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        This also deletes every folder template configured under this category. Archives that already used it are
        not affected.
      </Dialog>
    </>
  );
}

export function CategoryRow({ category, canManage }: { category: CategoryItem; canManage: boolean }) {
  const [renaming, setRenaming] = useState(false);

  return (
    <Card className="p-0">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3">
          <Icon
            name="chevron_right"
            size={20}
            className="shrink-0 text-on-surface-variant transition-transform group-open:rotate-90"
          />
          {renaming ? (
            <RenameCategoryForm categoryId={category.id} name={category.name} onDone={() => setRenaming(false)} />
          ) : (
            <>
              <span className="type-title-medium text-on-surface">{category.name}</span>
              <span className="ml-auto type-body-small text-on-surface-variant">
                {category.folderTemplates.length} {category.folderTemplates.length === 1 ? "folder" : "folders"}
              </span>
              {canManage && (
                <>
                  <Button
                    type="button"
                    variant="text"
                    size="inline"
                    icon="edit_square"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setRenaming(true);
                    }}
                  >
                    Edit
                  </Button>
                  <DeleteCategoryButton categoryId={category.id} categoryName={category.name} />
                </>
              )}
            </>
          )}
        </summary>
        <div className="border-t border-outline-variant/60 px-4 pb-4">
          <FolderTemplateList categoryId={category.id} folders={category.folderTemplates} canManage={canManage} />
          {canManage && <AddFolderForm categoryId={category.id} />}
        </div>
      </details>
    </Card>
  );
}
