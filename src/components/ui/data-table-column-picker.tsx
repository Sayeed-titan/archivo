"use client";

import { useState } from "react";
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
import { Dialog, Button, IconButton } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/cn";
import type { DataTableColumn } from "@/hooks/use-data-table";

// Column visibility + order picker, opened from the DataTable toolbar.
// Reorders via the same dnd-kit sortable-list pattern used for folder
// templates and workflow states — a popover/dialog list of rows, not a
// draggable live <thead> (dragging table headers directly is far more
// finicky than dragging a settings-style checklist).
function SortableRow({
  id,
  label,
  visible,
  onToggle,
}: {
  id: string;
  label: string;
  visible: boolean;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-xs border border-outline-variant bg-surface px-2 py-2",
        isDragging && "opacity-50 shadow-elevation-2"
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${label}`}
        className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-full text-on-surface-variant hover:bg-on-surface-8 active:cursor-grabbing"
      >
        <Icon name="drag_indicator" size={20} />
      </button>
      <label className="flex flex-1 items-center gap-2 type-body-medium text-on-surface">
        <input type="checkbox" className="size-4 accent-primary" checked={visible} onChange={onToggle} />
        {label}
      </label>
    </div>
  );
}

export function DataTableColumnPicker<TRow>({
  columns,
  columnOrder,
  hiddenKeys,
  onOrderChange,
  onToggle,
  dndContextId = "data-table-columns",
}: {
  columns: DataTableColumn<TRow>[];
  columnOrder: string[];
  hiddenKeys: Set<string>;
  onOrderChange: (order: string[]) => void;
  onToggle: (key: string) => void;
  /** Unique per DataTable instance when more than one appears on a page. */
  dndContextId?: string;
}) {
  const [open, setOpen] = useState(false);
  const byKey = new Map(columns.map((c) => [c.key, c]));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = columnOrder.indexOf(String(active.id));
    const newIndex = columnOrder.indexOf(String(over.id));
    const next = [...columnOrder];
    next.splice(oldIndex, 1);
    next.splice(newIndex, 0, String(active.id));
    onOrderChange(next);
  }

  return (
    <>
      <IconButton icon="view_column" label="Configure columns" variant="standard" onClick={() => setOpen(true)} />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        headline="Columns"
        actions={
          <Button variant="text" onClick={() => setOpen(false)}>
            Done
          </Button>
        }
        className="w-[min(calc(100vw-3rem),24rem)]"
      >
        <p className="mb-3 type-body-small text-on-surface-variant">
          Drag to reorder, or use arrow keys after selecting the handle. Uncheck to hide a column.
        </p>
        <DndContext id={dndContextId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={columnOrder} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {columnOrder.map((key) => {
                const col = byKey.get(key);
                if (!col) return null;
                return (
                  <SortableRow
                    key={key}
                    id={key}
                    label={col.label}
                    visible={!hiddenKeys.has(key)}
                    onToggle={() => onToggle(key)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </Dialog>
    </>
  );
}
