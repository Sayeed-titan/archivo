"use client";

import { useState, useTransition } from "react";
import { transitionArchiveStatus } from "@/app/actions/archives";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icon";
import { WorkflowStepper, type StepperState } from "@/components/workflow/workflow-stepper";

type TransitionOption = {
  toState: string;
  allowed: boolean;
  checks: { description: string; satisfied: boolean }[];
};

export function TransitionControls({
  archiveId,
  currentStatus,
  states,
  transitions,
}: {
  archiveId: string;
  currentStatus: string;
  states: StepperState[];
  transitions: TransitionOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);

  const allowedByState = new Map(transitions.map((t) => [t.toState, t]));
  const interactiveStateNames = transitions.filter((t) => t.allowed).map((t) => t.toState);
  const targetOption = pendingTarget ? allowedByState.get(pendingTarget) : undefined;

  function moveTo(toState: string) {
    setError(null);
    setPendingTarget(toState);
    startTransition(async () => {
      try {
        await transitionArchiveStatus(archiveId, toState);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to change status.");
      }
    });
  }

  return (
    <Card className="mt-4 p-4">
      <h2 className="type-title-small text-on-surface">Status</h2>
      <div className="mt-4 overflow-x-auto pb-1">
        <WorkflowStepper
          states={states}
          currentStateName={currentStatus}
          interactiveStateNames={interactiveStateNames}
          onStepClick={moveTo}
          disabled={isPending}
        />
      </div>

      {/* Requirement checklist for every reachable-but-unmet transition,
          plus the one currently being attempted (so a blocked click still
          explains itself even before hovering). */}
      {transitions.some((t) => t.checks.length > 0) && (
        <div className="mt-4 space-y-2 border-t border-outline-variant pt-3">
          {transitions
            .filter((t) => t.checks.length > 0)
            .map((t) => (
              <div key={t.toState}>
                <p className="type-label-medium text-on-surface-variant">To move to &quot;{t.toState}&quot;:</p>
                <ul className="mt-1 space-y-0.5">
                  {t.checks.map((c) => (
                    <li
                      key={c.description}
                      className={`flex items-center gap-1.5 type-body-small ${c.satisfied ? "text-success" : "text-error"}`}
                    >
                      <Icon name={c.satisfied ? "check_circle" : "cancel"} size={16} />
                      {c.description}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      )}

      {targetOption && isPending && (
        <p className="mt-3 flex items-center gap-2 type-body-medium text-on-surface-variant">
          <Icon name="progress_activity" size={16} className="animate-spin" />
          Moving to &quot;{targetOption.toState}&quot;…
        </p>
      )}

      {error && (
        <p className="mt-3 flex items-center gap-2 rounded-sm bg-error-container px-3 py-2 type-body-medium text-on-error-container">
          <Icon name="error" size={16} />
          {error}
        </p>
      )}
    </Card>
  );
}
