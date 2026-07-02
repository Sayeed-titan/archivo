import Link from "next/link";
import type { ReactNode } from "react";

// Audit found this exact shape (back link + title + optional subtitle +
// optional right-aligned actions) hand-rolled 6+ times with inconsistent
// wrapper spacing.
export function PageHeader({
  backHref,
  backLabel = "← Back",
  title,
  subtitle,
  actions,
}: {
  backHref?: string;
  backLabel?: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div>
      {backHref && (
        <Link href={backHref} className="text-sm text-slate-500 underline">
          {backLabel}
        </Link>
      )}
      <div className={`flex flex-wrap items-center justify-between gap-3 ${backHref ? "mt-4" : ""}`}>
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
