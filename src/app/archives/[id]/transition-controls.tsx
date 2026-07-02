"use client";

import { useState, useTransition } from "react";
import { transitionArchiveStatus } from "@/app/actions/archives";
import { Button, Card } from "@/components/ui";
import { Icon } from "@/components/icon";

type TransitionOption = {
  toState: string;
  allowed: boolean;
  checks: { description: string; satisfied: boolean }[];
};

export function TransitionControls({ archiveId, transitions }: { archiveId: string; transitions: TransitionOption[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="mt-4 p-4">
      <h2 className="type-title-small text-on-surface">Move to next status</h2>
      <div className="mt-3 space-y-3">
        {transitions.map((t) => (
          <div key={t.toState} className="flex flex-wrap items-start gap-3">
            <Button
              variant="tonal"
              icon="arrow_forward"
              disabled={!t.allowed || isPending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  try {
                    await transitionArchiveStatus(archiveId, t.toState);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Failed to change status.");
                  }
                })
              }
            >
              {t.toState}
            </Button>
            {t.checks.length > 0 && (
              <ul className="space-y-0.5 pt-1">
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
            )}
          </div>
        ))}
      </div>
      {error && (
        <p className="mt-3 flex items-center gap-2 rounded-sm bg-error-container px-3 py-2 type-body-medium text-on-error-container">
          <Icon name="error" size={16} />
          {error}
        </p>
      )}
    </Card>
  );
}
