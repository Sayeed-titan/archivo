import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

// MD3 cards (https://m3.material.io/components/cards): corner-medium,
// three container styles. `variant` picks the MD3 style; `tone` keeps the
// pre-MD3 semantic API (danger zones, warning banners) and overrides the
// container colors with the matching MD3 role pair.
const cardVariants = cva("rounded-md p-4", {
  variants: {
    variant: {
      outlined: "border border-outline-variant bg-surface",
      elevated: "bg-surface-container-low shadow-elevation-1",
      filled: "bg-surface-container-highest",
    },
    tone: {
      default: "",
      danger: "border border-transparent bg-error-container text-on-error-container",
      warn: "border border-transparent bg-warning-container text-on-warning-container",
    },
  },
  defaultVariants: {
    variant: "outlined",
    tone: "default",
  },
});

export type CardProps = VariantProps<typeof cardVariants> & {
  className?: string;
  children: ReactNode;
};

export function Card({ variant, tone, className, children }: CardProps) {
  return <div className={cn(cardVariants({ variant, tone }), className)}>{children}</div>;
}
