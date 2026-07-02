import { Icon } from "@/components/icon";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// Empty-state placeholder: icon in a tonal circle + headline + supporting
// text + optional call-to-action. Use inside cards, lists, or full pages
// wherever "there's nothing here yet" would otherwise be a bare sentence.
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
        <Icon name={icon} size={24} />
      </div>
      <h3 className="mt-3 type-title-medium text-on-surface">{title}</h3>
      {description && <p className="mt-1 max-w-sm type-body-medium text-on-surface-variant">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
