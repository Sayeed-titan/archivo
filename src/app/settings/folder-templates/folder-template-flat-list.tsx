"use client";

import { useState, useTransition } from "react";
import { toggleFolderMandatory } from "@/app/actions/folder-templates";
import { RemoveFolderButton } from "./remove-folder-button";
import { FolderRulesEditor } from "./folder-rules-editor";
import { RenameFolderForm } from "./rename-folder-form";
import type { FolderRules } from "@/lib/folder-rules";
import { Table, TableHead, Th, Td, TableRow, TableEmptyState, CheckboxField, Button } from "@/components/ui";

type FolderTemplateItem = { id: string; name: string; isMandatory: boolean; rules: FolderRules };
type CategoryItem = { id: string; name: string; folderTemplates: FolderTemplateItem[] };

function FlatFolderRow({
  categoryName,
  folder,
  position,
  canManage,
}: {
  categoryName: string;
  folder: FolderTemplateItem;
  position: number;
  canManage: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [mandatory, setMandatory] = useState(folder.isMandatory);
  const [, startTransition] = useTransition();

  return (
    <TableRow>
      <Td className="text-on-surface-variant">{position + 1}</Td>
      <Td className="text-on-surface-variant">{categoryName}</Td>
      <Td className="whitespace-normal">
        {editing ? (
          <RenameFolderForm
            folderTemplateId={folder.id}
            name={folder.name}
            isMandatory={folder.isMandatory}
            onDone={() => setEditing(false)}
          />
        ) : (
          folder.name
        )}
      </Td>
      <Td>
        {canManage ? (
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
        ) : mandatory ? (
          "Yes"
        ) : (
          "No"
        )}
      </Td>
      <Td>
        {canManage && !editing && (
          <div className="flex flex-wrap items-center gap-1">
            <Button type="button" variant="text" size="inline" icon="edit_square" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <FolderRulesEditor folderTemplateId={folder.id} folderName={folder.name} rules={folder.rules} />
            <RemoveFolderButton folderTemplateId={folder.id} />
          </div>
        )}
      </Td>
    </TableRow>
  );
}

// A flat, all-categories-at-once table — the counterpart to the accordion
// "Folders" view for scanning/comparing folders across many categories at
// once (e.g. spotting which categories are missing a required folder).
// Reordering is intentionally not available here: drag/keyboard reorder
// only makes sense within one category at a time, which is what the
// Folders view is for — this view is for reviewing structure and toggling
// per-folder flags, not for reorganizing.
export function FolderTemplateFlatList({ categories, canManage }: { categories: CategoryItem[]; canManage: boolean }) {
  const rows = categories.flatMap((category) =>
    category.folderTemplates.map((folder, index) => ({ category, folder, index }))
  );

  return (
    <Table>
      <TableHead>
        <Th className="w-12">#</Th>
        <Th>Category</Th>
        <Th>Folder</Th>
        <Th>Required</Th>
        <Th>Actions</Th>
      </TableHead>
      <tbody>
        {rows.length === 0 ? (
          <TableEmptyState colSpan={5} message="No folders configured yet." />
        ) : (
          rows.map(({ category, folder, index }) => (
            <FlatFolderRow
              key={folder.id}
              categoryName={category.name}
              folder={folder}
              position={index}
              canManage={canManage}
            />
          ))
        )}
      </tbody>
    </Table>
  );
}
