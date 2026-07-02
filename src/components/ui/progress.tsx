import { cn } from "@/lib/cn";

// MD3 circular progress indicator — used for button loading states and
// anywhere an operation is in flight.
export function CircularProgress({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

// MD3 linear progress / determinate meter (e.g. storage usage).
// `value` is 0..1; tone flips to error when over `dangerAt` (default 90%).
export function LinearProgress({
  value,
  dangerAt = 0.9,
  className,
}: {
  value: number;
  dangerAt?: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-secondary-container", className)}>
      <div
        className={cn("h-full rounded-full transition-all", clamped >= dangerAt ? "bg-error" : "bg-primary")}
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}
