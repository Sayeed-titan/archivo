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
import { reorderWorkflowStates } from "@/app/actions/workflow";
import { RemoveStateButton } from "./remove-state-button";
import { Badge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/cn";

type StateItem = { id: string; name: string; isInitial: boolean; isTerminal: boolean };

// Editable sequence builder: the same ordered-by-`order` concept the
// read-only WorkflowStepper visualizes on the archive detail page, but
// here each state is a draggable/keyboard-reorderable row (identical
// pattern to the folder-template reorder) rather than an interactive
// stepper circle — editing a sequence and moving through one are
// different enough interactions to warrant different affordances.
function SortableStateRow({ state }: { state: StateItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: state.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 type-body-medium text-on-surface",
        isDragging && "opacity-50"
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${state.name}`}
        className="flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-full text-on-surface-variant hover:bg-on-surface-8 active:cursor-grabbing"
      >
        <Icon name="drag_indicator" size={18} />
      </button>
      <span className="min-w-0 flex-1">
        {state.name}
        {state.isInitial && (
          <Badge tone="info" pill={false} className="ml-2">
            initial
          </Badge>
        )}
        {state.isTerminal && (
          <Badge tone="success" pill={false} className="ml-2">
            terminal
          </Badge>
        )}
      </span>
      <RemoveStateButton stateId={state.id} />
    </li>
  );
}

export function WorkflowStateEditor({ states }: { states: StateItem[] }) {
  const [order, setOrder] = useState(states.map((s) => s.id));
  const [, startTransition] = useTransition();
  const byId = new Map(states.map((s) => [s.id, s]));

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
    startTransition(() => reorderWorkflowStates(next));
  }

  if (states.length === 0) {
    return <p className="px-4 py-3 type-body-medium text-on-surface-variant">No states configured yet.</p>;
  }

  return (
    <DndContext id="workflow-states" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <ul className="divide-y divide-outline-variant/50 rounded-md border border-outline-variant bg-surface">
          {order.map((id) => {
            const state = byId.get(id);
            return state ? <SortableStateRow key={id} state={state} /> : null;
          })}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
