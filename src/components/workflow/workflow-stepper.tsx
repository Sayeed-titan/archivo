"use client";

import { cn } from "@/lib/cn";
import { Icon } from "@/components/icon";

// Visualizes an org's ordered WorkflowState sequence (by `order`) as a
// horizontal stepper (wraps to vertical on narrow screens), with the
// archive's current status highlighted. Deliberately linear: the
// underlying WorkflowTransition graph can technically skip states
// (fromState/toState aren't required to be adjacent in `order`), but
// this draws every state 1..N in sequence and marks whichever step(s)
// are reachable right now via `interactiveStates`, rather than
// attempting a general graph layout — a stated simplification, not an
// oversight.
export type StepperState = { name: string; order: number };

export function WorkflowStepper({
  states,
  currentStateName,
  interactiveStateNames = [],
  onStepClick,
  disabled = false,
}: {
  states: StepperState[];
  currentStateName: string;
  /** Which non-current states can currently be moved to (renders as clickable). */
  interactiveStateNames?: string[];
  onStepClick?: (stateName: string) => void;
  disabled?: boolean;
}) {
  const ordered = [...states].sort((a, b) => a.order - b.order);
  const currentIndex = ordered.findIndex((s) => s.name === currentStateName);

  return (
    <div className="flex flex-wrap items-center gap-y-4 sm:flex-nowrap">
      {ordered.map((state, index) => {
        const isPast = currentIndex >= 0 && index < currentIndex;
        const isCurrent = index === currentIndex;
        const isInteractive = !isCurrent && interactiveStateNames.includes(state.name);

        const circle = (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full type-label-large transition-colors",
              isCurrent && "bg-primary text-on-primary shadow-elevation-1",
              isPast && "bg-primary-container text-on-primary-container",
              !isCurrent && !isPast && isInteractive && "border-2 border-primary text-primary",
              !isCurrent && !isPast && !isInteractive && "border-2 border-outline-variant text-on-surface-variant"
            )}
          >
            {isPast ? <Icon name="check" size={18} /> : index + 1}
          </span>
        );

        return (
          <div key={state.name} className="flex min-w-0 flex-1 items-center last:flex-none sm:min-w-[7rem]">
            <div className="flex flex-col items-center gap-1.5">
              {isInteractive ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onStepClick?.(state.name)}
                  className="rounded-full transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Move to ${state.name}`}
                >
                  {circle}
                </button>
              ) : (
                circle
              )}
              <span
                className={cn(
                  "max-w-24 truncate type-label-medium",
                  isCurrent ? "text-on-surface" : "text-on-surface-variant",
                  isInteractive && "text-primary"
                )}
                title={state.name}
              >
                {state.name}
              </span>
            </div>
            {index < ordered.length - 1 && (
              <div className={cn("mx-1 h-0.5 flex-1 sm:mx-2", isPast ? "bg-primary-container" : "bg-outline-variant")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
