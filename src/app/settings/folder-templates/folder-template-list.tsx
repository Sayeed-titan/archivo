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
import { reorderFolderTemplates, toggleFolderMandatory } from "@/app/actions/folder-templates";
import { RemoveFolderButton } from "./remove-folder-button";
import { FolderRulesEditor } from "./folder-rules-editor";
import { RenameFolderForm } from "./rename-folder-form";
import type { FolderRules } from "@/lib/folder-rules";
import { Badge, Button, CheckboxField } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/cn";

type FolderTemplateItem = { id: string; name: string; isMandatory: boolean; rules: FolderRules };

function SortableFolderRow({
  folder,
  position,
  count,
  canManage,
  onMove,
}: {
  folder: FolderTemplateItem;
  position: number;
  count: number;
  canManage: boolean;
  onMove: (direction: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: folder.id });
  const [editing, setEditing] = useState(false);
  const [mandatory, setMandatory] = useState(folder.isMandatory);
  const [, startTransition] = useTransition();

  // dnd-kit's own keyboard sensor requires an explicit Space/Enter "pick up"
  // before arrow keys do anything, which isn't obvious and reads as "arrow
  // keys don't work" — this handles Up/Down directly on the focused handle
  // instead, moving the row immediately with no pick-up step. Left/Right are
  // deliberately not bound here: this is a single-column vertical list, so
  // there's no second axis for them to control.
  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowUp" && position > 0) {
      e.preventDefault();
      onMove(-1);
    } else if (e.key === "ArrowDown" && position < count - 1) {
      e.preventDefault();
      onMove(1);
    }
  }

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
          onKeyDown={(e) => {
            listeners?.onKeyDown?.(e);
            handleKeyDown(e);
          }}
          aria-label={`Reorder ${folder.name}. Press Up or Down to move.`}
          className="flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-full text-on-surface-variant hover:bg-on-surface-8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:cursor-grabbing"
        >
          <Icon name="drag_indicator" size={18} />
        </button>
      )}
      <span className="w-5 shrink-0 text-right type-label-small text-on-surface-variant" aria-hidden="true">
        {position + 1}.
      </span>
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
            {mandatory && (
              <Badge tone="warning" pill={false} className="ml-2">
                required
              </Badge>
            )}
          </span>
          {canManage && (
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
          )}
          {canManage && (
            <Button
              type="button"
              variant="text"
              size="inline"
              icon="edit_square"
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
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

  function commitOrder(next: string[]) {
    setOrder(next);
    startTransition(() => reorderFolderTemplates(categoryId, next));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    const next = [...order];
    next.splice(oldIndex, 1);
    next.splice(newIndex, 0, String(active.id));
    commitOrder(next);
  }

  function moveByIndex(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= order.length) return;
    const next = [...order];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    commitOrder(next);
  }

  if (folders.length === 0) {
    return <p className="py-2 type-body-medium text-on-surface-variant">No folders configured yet.</p>;
  }

  return (
    <DndContext id={`folder-templates-${categoryId}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      {canManage && (
        <p className="pb-1 type-body-small text-on-surface-variant">
          Drag the handle to reorder, or tab to it and press Up/Down to move.
        </p>
      )}
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <ul className="divide-y divide-outline-variant/50">
          {order.map((id, index) => {
            const folder = byId.get(id);
            return folder ? (
              <SortableFolderRow
                key={id}
                folder={folder}
                position={index}
                count={order.length}
                canManage={canManage}
                onMove={(direction) => moveByIndex(index, direction)}
              />
            ) : null;
          })}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
