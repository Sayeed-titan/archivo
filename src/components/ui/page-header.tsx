import Link from "next/link";
import { Icon } from "@/components/icon";
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
      {backHref && (
        <Link
          href={backHref}
          className="no-print inline-flex items-center gap-1 rounded-full py-1 pl-1 pr-3 type-label-large text-on-surface-variant transition-colors hover:bg-on-surface-8 hover:text-on-surface"
        >
          <Icon name="arrow_back" size={18} />
          {backLabel}
        </Link>
      )}
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
