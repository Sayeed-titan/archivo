import { cn } from "@/lib/cn";

// Material Symbols icon (ligature-based variable font, loaded via
// next/font in layout.tsx and wired to .material-icon in globals.css).
// `name` is any icon name from https://fonts.google.com/icons —
// e.g. <Icon name="search" />. `filled` switches the FILL axis on
// (used for the active navigation destination per MD3 spec).
export function Icon({
  name,
  filled = false,
  size = 24,
  className,
}: {
  name: string;
  filled?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("material-icon", filled && "material-icon-filled", className)}
      style={{ fontSize: size }}
    >
      {name}
    </span>
  );
}
