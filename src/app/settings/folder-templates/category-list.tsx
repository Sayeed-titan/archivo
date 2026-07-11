"use client";

import { useState } from "react";
import { CategoryRow } from "./category-row";
import { AddCategoryForm } from "./add-category-form";
import { FolderTemplateFlatList } from "./folder-template-flat-list";
import type { FolderRules } from "@/lib/folder-rules";
import { ClearableSearchField, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/cn";

type FolderTemplateItem = { id: string; name: string; isMandatory: boolean; rules: FolderRules };
type CategoryItem = { id: string; name: string; folderTemplates: FolderTemplateItem[] };

type View = "folders" | "list";

const VIEW_OPTIONS: { value: View; icon: string; label: string }[] = [
  { value: "folders", icon: "folder", label: "Folders view" },
  { value: "list", icon: "view_list", label: "List view" },
];

export function CategoryList({ categories, canManage }: { categories: CategoryItem[]; canManage: boolean }) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("folders");
  const filtered =
    query.trim() === ""
      ? categories
      : categories.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {categories.length > 5 && (
          <ClearableSearchField name="categorySearch" placeholder="Search categories…" onChange={setQuery} className="flex-1" />
        )}
        <div className="ml-auto flex items-center rounded-full border border-outline-variant p-0.5">
          {VIEW_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              title={o.label}
              aria-label={o.label}
              aria-pressed={view === o.value}
              onClick={() => setView(o.value)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                view === o.value
                  ? "bg-secondary-container text-on-secondary-container"
                  : "text-on-surface-variant hover:bg-on-surface-8"
              )}
            >
              <Icon name={o.icon} size={18} />
            </button>
          ))}
        </div>
      </div>
      {canManage && view === "folders" && <AddCategoryForm />}
      {filtered.length === 0 ? (
        <EmptyState
          icon="search_off"
          title="No categories match"
          description={`No category name contains "${query}".`}
        />
      ) : view === "folders" ? (
        filtered.map((category) => <CategoryRow key={category.id} category={category} canManage={canManage} />)
      ) : (
        <FolderTemplateFlatList categories={filtered} canManage={canManage} />
      )}
    </div>
  );
}
