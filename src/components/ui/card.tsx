import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

// Audit found `rounded-md` vs `rounded-lg` panels used interchangeably
// for the same purpose (settings sections, form wrappers, dashboard
// summary cards, danger-zone boxes). Standardizing on rounded-md
// everywhere except summary-card-style stat tiles (lg), which is the one
// place the wireframe itself uses a larger radius.
const cardVariants = cva("rounded-md border p-4", {
  variants: {
    tone: {
      default: "border-slate-200 bg-white",
      danger: "border-red-200 bg-red-50",
      warn: "border-amber-200 bg-amber-50",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

export type CardProps = VariantProps<typeof cardVariants> & {
  className?: string;
  children: ReactNode;
};

export function Card({ tone, className, children }: CardProps) {
  return <div className={cn(cardVariants({ tone }), className)}>{children}</div>;
}
