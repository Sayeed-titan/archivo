import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

// Status/tag chip mapped to MD3 container/on-container role pairs — the
// success/warning roles are the harmonized extended colors generated with
// the org's scheme (src/lib/theme/scheme.ts), so badges re-tint with the
// brand seed automatically. `pill` keeps the two render modes: a chip
// (MD3 corner-small, like assist chips) vs bare colored text for dense
// inline tags ("required", "initial", "default template").
const badgeVariants = cva("inline-flex items-center gap-1 font-medium", {
  variants: {
    tone: {
      neutral: "bg-surface-container-highest text-on-surface-variant",
      success: "bg-success-container text-on-success-container",
      warning: "bg-warning-container text-on-warning-container",
      danger: "bg-error-container text-on-error-container",
      info: "bg-secondary-container text-on-secondary-container",
    },
    pill: {
      true: "rounded-sm px-2 py-0.5 type-label-medium",
      false: "bg-transparent type-label-medium",
    },
  },
  compoundVariants: [
    // Plain-text mode drops the container fill and uses the on-container
    // color directly against the page surface.
    { tone: "neutral", pill: false, className: "text-on-surface-variant" },
    { tone: "success", pill: false, className: "text-success" },
    { tone: "warning", pill: false, className: "text-warning" },
    { tone: "danger", pill: false, className: "text-error" },
    { tone: "info", pill: false, className: "text-secondary" },
  ],
  defaultVariants: {
    tone: "neutral",
    pill: true,
  },
});

export type BadgeProps = VariantProps<typeof badgeVariants> & {
  className?: string;
  children: ReactNode;
};

export function Badge({ tone, pill, className, children }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, pill }), className)}>{children}</span>;
}
