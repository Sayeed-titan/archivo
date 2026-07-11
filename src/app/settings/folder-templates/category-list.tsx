"use client";

import { useState } from "react";
import { CategoryRow } from "./category-row";
import { AddCategoryForm } from "./add-category-form";
import type { FolderRules } from "@/lib/folder-rules";
import { ClearableSearchField, EmptyState } from "@/components/ui";

type FolderTemplateItem = { id: string; name: string; isMandatory: boolean; rules: FolderRules };
type CategoryItem = { id: string; name: string; folderTemplates: FolderTemplateItem[] };

export function CategoryList({ categories, canManage }: { categories: CategoryItem[]; canManage: boolean }) {
  const [query, setQuery] = useState("");
  const filtered =
    query.trim() === ""
      ? categories
      : categories.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="mt-8 space-y-4">
      {categories.length > 5 && (
        <ClearableSearchField name="categorySearch" placeholder="Search categories…" onChange={setQuery} />
      )}
      {canManage && <AddCategoryForm />}
      {filtered.length === 0 ? (
        <EmptyState
          icon="search_off"
          title="No categories match"
          description={`No category name contains "${query}".`}
        />
      ) : (
        filtered.map((category) => <CategoryRow key={category.id} category={category} canManage={canManage} />)
      )}
    </div>
  );
}
