"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { reorderFolderTemplates } from "@/app/actions/folder-templates";
import { RemoveFolderButton } from "./remove-folder-button";
import { FolderRulesEditor } from "./folder-rules-editor";
import { RenameFolderForm } from "./rename-folder-form";
import type { FolderRules } from "@/lib/folder-rules";
import { Badge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/cn";

type FolderTemplateItem = { id: string; name: string; isMandatory: boolean; rules: FolderRules };

function SortableFolderRow({ folder, canManage }: { folder: FolderTemplateItem; canManage: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: folder.id });
  const [editing, setEditing] = useState(false);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 py-2 type-body-medium text-on-surface",
        isDragging && "opacity-50"
      )}
    >
      {canManage && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${folder.name}`}
          className="flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-full text-on-surface-variant hover:bg-on-surface-8 active:cursor-grabbing"
        >
          <Icon name="drag_indicator" size={18} />
        </button>
      )}
      {editing ? (
        <RenameFolderForm
          folderTemplateId={folder.id}
          name={folder.name}
          isMandatory={folder.isMandatory}
          onDone={() => setEditing(false)}
        />
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate">
            {folder.name}
            {folder.isMandatory && (
              <Badge tone="warning" pill={false} className="ml-2">
                required
              </Badge>
            )}
          </span>
          {canManage && (
            <button
              type="button"
              aria-label={`Rename ${folder.name}`}
              onClick={() => setEditing(true)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-on-surface-8"
            >
              <Icon name="edit" size={16} />
            </button>
          )}
          {canManage && <FolderRulesEditor folderTemplateId={folder.id} folderName={folder.name} rules={folder.rules} />}
          {canManage && <RemoveFolderButton folderTemplateId={folder.id} />}
        </>
      )}
    </li>
  );
}

export function FolderTemplateList({
  categoryId,
  folders,
  canManage,
}: {
  categoryId: string;
  folders: FolderTemplateItem[];
  canManage: boolean;
}) {
  const [order, setOrder] = useState(folders.map((f) => f.id));
  const [, startTransition] = useTransition();
  const byId = new Map(folders.map((f) => [f.id, f]));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    const next = [...order];
    next.splice(oldIndex, 1);
    next.splice(newIndex, 0, String(active.id));
    setOrder(next);
    startTransition(() => reorderFolderTemplates(categoryId, next));
  }

  if (folders.length === 0) {
    return <p className="py-2 type-body-medium text-on-surface-variant">No folders configured yet.</p>;
  }

  return (
    <DndContext id={`folder-templates-${categoryId}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <ul className="divide-y divide-outline-variant/50">
          {order.map((id) => {
            const folder = byId.get(id);
            return folder ? <SortableFolderRow key={id} folder={folder} canManage={canManage} /> : null;
          })}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
