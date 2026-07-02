import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

const buttonVariants = cva("inline-flex items-center justify-center gap-1.5 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50", {
  variants: {
    variant: {
      primary: "rounded-md bg-slate-900 text-white hover:bg-slate-800",
      secondary: "rounded-md border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
      "danger-outline": "rounded-md border border-red-300 bg-white text-red-700 hover:bg-red-50",
      "danger-solid": "rounded-md bg-red-700 text-white hover:bg-red-800",
      ghost: "text-slate-600 underline hover:text-slate-900",
      "danger-ghost": "text-slate-400 hover:text-red-600",
    },
    size: {
      sm: "text-sm px-3 py-1",
      md: "text-sm px-3 py-1.5",
      lg: "text-sm px-4 py-2",
      inline: "text-xs",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

type BaseProps = VariantProps<typeof buttonVariants> & {
  className?: string;
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
};

type ButtonAsButton = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
    href?: undefined;
  };

type ButtonAsLink = BaseProps & {
  href: string;
};

export type ButtonProps = ButtonAsButton | ButtonAsLink;

// Button variant reference (audit found ~15 near-duplicate button class
// strings across the app with inconsistent padding/disabled handling —
// this is the single source of truth going forward):
//   primary        — main CTA (slate-900 fill)
//   secondary      — outlined nav/cancel action
//   danger-outline — destructive action, low emphasis (e.g. soft delete)
//   danger-solid   — destructive action, high emphasis (e.g. confirm hard delete)
//   ghost          — text-only link-style action (back links, "add filter")
//   danger-ghost   — bare inline destructive trigger, pair with size="inline"
//                    (e.g. "remove" in a dense settings-list row — no box
//                    model at all, unlike every other variant)
// size="inline" has no padding/rounded corners — use only with ghost/
// danger-ghost variants inside already-dense rows (list items, metadata
// lines) where a real button's box model would break the layout.
export function Button(props: ButtonProps) {
  const { variant, size, className, loading, loadingText, children, ...rest } = props;
  const classes = cn(buttonVariants({ variant, size }), className);

  if ("href" in props && props.href !== undefined) {
    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    );
  }

  const buttonRest = rest as Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;
  return (
    <button className={classes} disabled={loading || buttonRest.disabled} {...buttonRest}>
      {loading ? (loadingText ?? children) : children}
    </button>
  );
}
