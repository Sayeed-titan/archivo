import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

// Audit found ~4 near-identical status-badge class strings (dashboard's
// STATUS_BADGE_CLASSES, HealthBadge, category chips, plain-text tags like
// "required"/"initial"/"default template") each with slightly different
// padding/radius. One component, two render modes (pill vs plain text
// tag), covers all of them.
const badgeVariants = cva("inline-flex items-center font-medium", {
  variants: {
    tone: {
      neutral: "bg-slate-100 text-slate-600 border-slate-200",
      success: "bg-emerald-50 text-emerald-700 border-emerald-200",
      warning: "bg-amber-50 text-amber-700 border-amber-200",
      danger: "bg-red-50 text-red-700 border-red-200",
      info: "bg-blue-50 text-blue-700 border-blue-200",
    },
    pill: {
      true: "rounded-full border px-2 py-0.5 text-xs",
      false: "text-xs",
    },
  },
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
