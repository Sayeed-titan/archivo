"use client";

import { useState, useTransition } from "react";
import { transitionArchiveStatus } from "@/app/actions/archives";
import { Button, Card } from "@/components/ui";

type TransitionOption = {
  toState: string;
  allowed: boolean;
  checks: { description: string; satisfied: boolean }[];
};

export function TransitionControls({ archiveId, transitions }: { archiveId: string; transitions: TransitionOption[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="mt-3 p-3">
      <h2 className="text-sm font-medium text-slate-700">Move to next status</h2>
      <div className="mt-2 space-y-2">
        {transitions.map((t) => (
          <div key={t.toState} className="flex items-start gap-3">
            <Button
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
              → {t.toState}
            </Button>
            {t.checks.length > 0 && (
              <ul className="text-xs text-slate-500">
                {t.checks.map((c) => (
                  <li key={c.description} className={c.satisfied ? "text-emerald-600" : "text-red-600"}>
                    {c.satisfied ? "✓" : "✗"} {c.description}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
