"use client";

import { useState } from "react";
import { parseRequirements, describeRequirement, type WorkflowRequirement } from "@/lib/workflow/requirements";
import { RemoveTransitionButton } from "./remove-transition-button";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/cn";

type StateItem = { id: string; name: string; order: number };
type TransitionItem = { id: string; fromState: string; toState: string; requirements: unknown };

// Visualizes configured transitions as edges on the state sequence:
// adjacent-in-order transitions draw as a solid arrow directly between
// the two state chips; anything else (the transition graph can
// technically connect any two states, not just neighbors) is listed
// below as a "non-adjacent" edge with a dashed-line icon, rather than
// attempting a general graph layout — see workflow-stepper.tsx's own
// comment for the same simplification on the read-only version.
export function TransitionGraph({ states, transitions }: { states: StateItem[]; transitions: TransitionItem[] }) {
  const ordered = [...states].sort((a, b) => a.order - b.order);
  const [openId, setOpenId] = useState<string | null>(null);

  const adjacentEdges: (TransitionItem | undefined)[] = [];
  const nonAdjacent: TransitionItem[] = [];

  for (const t of transitions) {
    const fromIndex = ordered.findIndex((s) => s.name === t.fromState);
    const toIndex = ordered.findIndex((s) => s.name === t.toState);
    if (fromIndex >= 0 && toIndex === fromIndex + 1) {
      adjacentEdges[fromIndex] = t;
    } else {
      nonAdjacent.push(t);
    }
  }

  if (states.length === 0) {
    return <p className="px-4 py-3 type-body-medium text-on-surface-variant">Add at least two states to define a transition.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-y-3 overflow-x-auto rounded-md border border-outline-variant bg-surface p-4">
        {ordered.map((state, index) => (
          <div key={state.id} className="flex items-center">
            <span className="whitespace-nowrap rounded-full border border-outline-variant bg-surface-container px-3 py-1.5 type-label-large text-on-surface">
              {state.name}
            </span>
            {index < ordered.length - 1 && (
              <div className="mx-1 flex items-center">
                {adjacentEdges[index] ? (
                  <EdgeButton
                    open={openId === adjacentEdges[index]!.id}
                    onToggle={() => setOpenId((v) => (v === adjacentEdges[index]!.id ? null : adjacentEdges[index]!.id))}
                  />
                ) : (
                  <Icon name="arrow_right_alt" size={20} className="text-outline-variant" />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {openId && (
        <TransitionDetail transition={transitions.find((t) => t.id === openId)!} />
      )}

      {nonAdjacent.length > 0 && (
        <div>
          <p className="type-label-medium text-on-surface-variant">Other transitions (not adjacent in the sequence):</p>
          <ul className="mt-2 divide-y divide-outline-variant/50 rounded-md border border-outline-variant bg-surface">
            {nonAdjacent.map((t) => (
              <li key={t.id} className="px-4 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 type-label-large text-on-surface">
                    {t.fromState}
                    <Icon name="trending_flat" size={16} className="text-on-surface-variant" />
                    {t.toState}
                  </span>
                  <RemoveTransitionButton transitionId={t.id} />
                </div>
                <RequirementList requirements={t.requirements} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EdgeButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={cn(
        "flex items-center gap-1 rounded-full px-2 py-1 type-label-medium transition-colors hover:bg-primary-8",
        open ? "bg-primary-container text-on-primary-container" : "text-primary"
      )}
    >
      <Icon name="arrow_right_alt" size={20} />
      <Icon name="rule" size={14} />
    </button>
  );
}

function TransitionDetail({ transition }: { transition: TransitionItem }) {
  return (
    <div className="rounded-md border border-outline-variant bg-surface-container-low p-4">
      <div className="flex items-center justify-between">
        <span className="type-label-large text-on-surface">
          {transition.fromState} → {transition.toState}
        </span>
        <RemoveTransitionButton transitionId={transition.id} />
      </div>
      <RequirementList requirements={transition.requirements} />
    </div>
  );
}

function RequirementList({ requirements }: { requirements: unknown }) {
  const parsed: WorkflowRequirement[] = parseRequirements(requirements);
  return (
    <ul className="mt-1.5 space-y-0.5 type-body-small text-on-surface-variant">
      {parsed.map((req, i) => (
        <li key={i} className="flex items-center gap-1.5">
          <Icon name="check_circle" size={14} />
          {describeRequirement(req)}
        </li>
      ))}
      {parsed.length === 0 && <li>No requirements — always allowed.</li>}
    </ul>
  );
}
