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
import { reorderWorkflowStates, duplicateWorkflowState } from "@/app/actions/workflow";
import { RemoveStateButton } from "./remove-state-button";
import { EditStateDialog } from "./edit-state-dialog";
import { Badge } from "@/components/ui";
import { Menu, MenuItem } from "@/components/ui/menu";
import { IconButton } from "@/components/ui/icon-button";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/cn";

type StateItem = { id: string; name: string; isInitial: boolean; isTerminal: boolean };

// State-row action menu: hover reveals a ⋮ trigger (group-hover so it isn't
// permanently visible and cluttering the row), same Menu/MenuItem primitive
// the avatar menu uses elsewhere in the app. Edit opens a dialog; Duplicate
// and Delete fire directly since they don't need a form.
function StateRowMenu({ state }: { state: StateItem }) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <div className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <Menu
          trigger={({ toggle }) => (
            <IconButton icon="more_vert" label={`Actions for ${state.name}`} size={20} onClick={toggle} />
          )}
        >
          <MenuItem icon="edit" onClick={() => setEditOpen(true)}>
            Edit
          </MenuItem>
          <MenuItem icon="content_copy" onClick={() => duplicateWorkflowState(state.id)}>
            Duplicate
          </MenuItem>
          <RemoveStateButton stateId={state.id} asMenuItem />
        </Menu>
      </div>
      <EditStateDialog state={state} open={editOpen} onClose={() => setEditOpen(false)} />
    </>
  );
}

function StateRowLabel({ state }: { state: StateItem }) {
  return (
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
  );
}

// Pinned row (Initial or Terminal): no drag handle at all, since these
// positions are always first/last respectively — offering a handle that
// then refuses to move would be confusing. See the comment on
// WorkflowStateEditor below for why this replaced the earlier
// clamped-drag approach.
function PinnedStateRow({ state }: { state: StateItem }) {
  return (
    <li className="group flex items-center gap-2 px-4 py-2.5 type-body-medium text-on-surface">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center text-on-surface-variant/40">
        <Icon name="push_pin" size={16} />
      </span>
      <StateRowLabel state={state} />
      <StateRowMenu state={state} />
    </li>
  );
}

function SortableStateRow({ state }: { state: StateItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: state.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group flex items-center gap-2 px-4 py-2.5 type-body-medium text-on-surface",
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
      <StateRowLabel state={state} />
      <StateRowMenu state={state} />
    </li>
  );
}

// States are auto-ordered at the ends: the initial state is always
// rendered first and terminal states always last, neither draggable —
// there is never a legitimate reason to place them anywhere else, so
// instead of allowing the drag and clamping/rejecting invalid drops (the
// previous approach), they're simply excluded from the sortable list.
// Only the "middle" states are freely reorderable among themselves.
export function WorkflowStateEditor({ states }: { states: StateItem[] }) {
  const initial = states.filter((s) => s.isInitial);
  const terminal = states.filter((s) => s.isTerminal);
  const middle = states.filter((s) => !s.isInitial && !s.isTerminal);

  const [order, setOrder] = useState(middle.map((s) => s.id));
  const [, startTransition] = useTransition();
  const byId = new Map(middle.map((s) => [s.id, s]));

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
    startTransition(() => reorderWorkflowStates([...initial.map((s) => s.id), ...next, ...terminal.map((s) => s.id)]));
  }

  if (states.length === 0) {
    return <p className="px-4 py-3 type-body-medium text-on-surface-variant">No states configured yet.</p>;
  }

  return (
    <ul className="divide-y divide-outline-variant/50 rounded-md border border-outline-variant bg-surface">
      {initial.map((state) => (
        <PinnedStateRow key={state.id} state={state} />
      ))}
      <DndContext id="workflow-states" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {order.map((id) => {
            const state = byId.get(id);
            return state ? <SortableStateRow key={id} state={state} /> : null;
          })}
        </SortableContext>
      </DndContext>
      {terminal.map((state) => (
        <PinnedStateRow key={state.id} state={state} />
      ))}
    </ul>
  );
}
