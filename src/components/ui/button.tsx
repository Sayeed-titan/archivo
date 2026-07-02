import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/icon";
import { CircularProgress } from "./progress";
import type { ButtonHTMLAttributes } from "react";

// MD3 common buttons (https://m3.material.io/components/buttons).
// Canonical variants use the spec names — prefer these in new code:
//   filled          — highest emphasis, the one main CTA on a page
//   tonal           — medium emphasis (secondary-container fill)
//   elevated        — filled-surface + shadow, for buttons on colored areas
//   outlined        — medium emphasis with an outline, cancel/secondary nav
//   text            — lowest emphasis, inline/dialog actions
//   filled-error / tonal-error / outlined-error / text-error — destructive
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full type-label-large transition-[background-color,box-shadow,color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-on-surface-12 disabled:text-on-surface/38 disabled:shadow-none",
  {
    variants: {
      variant: {
        filled: "bg-primary text-on-primary hover:bg-primary-hover hover:shadow-elevation-1",
        tonal: "bg-secondary-container text-on-secondary-container hover:bg-secondary-container-hover hover:shadow-elevation-1",
        elevated: "bg-surface-container-low text-primary shadow-elevation-1 hover:bg-primary-8 hover:shadow-elevation-2",
        outlined: "border border-outline text-primary hover:bg-primary-8 disabled:border-on-surface-12 disabled:bg-transparent",
        text: "text-primary hover:bg-primary-8 disabled:bg-transparent",
        "filled-error": "bg-error text-on-error hover:bg-error-hover hover:shadow-elevation-1",
        "tonal-error": "bg-error-container text-on-error-container hover:bg-error-container-hover",
        "outlined-error": "border border-outline text-error hover:bg-error-8 disabled:border-on-surface-12 disabled:bg-transparent",
        "text-error": "text-error hover:bg-error-8 disabled:bg-transparent",
      },
      size: {
        sm: "h-8 px-4 text-xs",
        md: "h-10 px-6",
        lg: "h-12 px-7",
        // No box model at all — bare inline trigger inside dense text rows
        // (settings-list "remove" links). Pair with text/text-error.
        inline: "gap-1 rounded-none text-xs hover:bg-transparent hover:underline",
      },
    },
    defaultVariants: {
      variant: "filled",
      size: "md",
    },
  }
);

type BaseProps = VariantProps<typeof buttonVariants> & {
  className?: string;
  loading?: boolean;
  loadingText?: string;
  /** Material Symbols name for an optional leading icon. */
  icon?: string;
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

export function Button(props: ButtonProps) {
  const { variant, size, className, loading, loadingText, icon, children, ...rest } = props;
  const classes = cn(
    buttonVariants({ variant, size }),
    // MD3: buttons with a leading icon pull the left padding in one step
    (icon || loading) && size !== "inline" && "pl-4",
    className
  );

  const content = (
    <>
      {loading ? <CircularProgress size={18} /> : icon ? <Icon name={icon} size={18} /> : null}
      {loading ? (loadingText ?? children) : children}
    </>
  );

  if ("href" in props && props.href !== undefined) {
    return (
      <Link href={props.href} className={classes}>
        {content}
      </Link>
    );
  }

  const buttonRest = rest as Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;
  return (
    <button className={classes} disabled={loading || buttonRest.disabled} {...buttonRest}>
      {content}
    </button>
  );
}
