import Link from "next/link";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/icon";

// MD3 extended floating action button — the app's single most important
// action (New archive), shown in the navigation rail/drawer per spec.
export function ExtendedFab({
  href,
  icon,
  label,
  collapsed = false,
  className,
}: {
  href: string;
  icon: string;
  label: string;
  /** Icon-only square FAB (used in the narrow rail). */
  collapsed?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      title={label}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg bg-primary-container text-on-primary-container shadow-elevation-1 transition-[background-color,box-shadow] hover:bg-primary-container-hover hover:shadow-elevation-2",
        collapsed ? "h-14 w-14" : "h-14 px-4",
        className
      )}
    >
      <Icon name={icon} size={24} />
      {!collapsed && <span className="type-label-large">{label}</span>}
    </Link>
  );
}
