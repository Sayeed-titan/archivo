import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/icon";
import type { ButtonHTMLAttributes } from "react";

// MD3 icon buttons (https://m3.material.io/components/icon-buttons).
// 40x40 target, round. `label` is required — it becomes the accessible
// name (and the hover tooltip via title).
const iconButtonVariants = cva(
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:text-on-surface/38",
  {
    variants: {
      variant: {
        standard: "text-on-surface-variant hover:bg-on-surface-8",
        filled: "bg-primary text-on-primary hover:bg-primary-hover",
        tonal: "bg-secondary-container text-on-secondary-container hover:bg-secondary-container-hover",
        outlined: "border border-outline text-on-surface-variant hover:bg-on-surface-8",
      },
    },
    defaultVariants: { variant: "standard" },
  }
);

type BaseProps = VariantProps<typeof iconButtonVariants> & {
  icon: string;
  label: string;
  filledIcon?: boolean;
  size?: number;
  className?: string;
};

type AsButton = BaseProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & { href?: undefined };
type AsLink = BaseProps & { href: string };

export type IconButtonProps = AsButton | AsLink;

export function IconButton(props: IconButtonProps) {
  const { icon, label, filledIcon, size = 24, variant, className, ...rest } = props;
  const classes = cn(iconButtonVariants({ variant }), className);
  const inner = <Icon name={icon} filled={filledIcon} size={size} />;

  if ("href" in props && props.href !== undefined) {
    return (
      <Link href={props.href} className={classes} aria-label={label} title={label}>
        {inner}
      </Link>
    );
  }

  const buttonRest = rest as Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;
  return (
    <button type="button" className={classes} aria-label={label} title={label} {...buttonRest}>
      {inner}
    </button>
  );
}
