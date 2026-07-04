import { BackLink } from "./back-link";
import type { ReactNode } from "react";

// Page header: optional back link + MD3 headline + optional supporting
// text + right-aligned actions slot.
export function PageHeader({
  backHref,
  backLabel = "Back",
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
      {backHref && <BackLink href={backHref} label={backLabel} />}
      <div className={`flex flex-wrap items-center justify-between gap-3 ${backHref ? "mt-3" : ""}`}>
        <div>
          <h1 className="type-headline-small text-on-surface">{title}</h1>
          {subtitle && <p className="mt-1 type-body-medium text-on-surface-variant">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
