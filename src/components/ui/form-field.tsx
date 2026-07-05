import { cn } from "@/lib/cn";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

// MD3-styled form fields (outlined text field treatment, simplified to a
// label-above layout — labels stay readable for selects/dates and dense
// filter rows, which the floating-label pattern handles poorly).
// Focus ring: outline thickens to 2px primary per spec.
const controlClasses =
  "w-full rounded-xs border border-outline bg-surface px-3 py-2 type-body-medium text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:border-on-surface-12 disabled:bg-on-surface-8 disabled:text-on-surface/38";
const compactControlClasses =
  "rounded-xs border border-outline bg-surface px-2 py-1 type-body-medium text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

function FieldWrapper({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label?: ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={htmlFor} className="block type-label-large text-on-surface-variant">
          {label}
        </label>
      )}
      {children}
      {hint && !error && <p className="type-body-small text-on-surface-variant">{hint}</p>}
      {error && <p className="type-body-small text-error">{error}</p>}
    </div>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  error?: string;
  hint?: string;
  compact?: boolean;
};

export function TextField({ label, error, hint, compact, className, id, ...rest }: TextFieldProps) {
  return (
    <FieldWrapper label={label} htmlFor={id} error={error} hint={hint}>
      <input id={id} className={cn(compact ? compactControlClasses : controlClasses, error && "border-error focus:border-error focus:ring-error", className)} {...rest} />
    </FieldWrapper>
  );
}

type TextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: ReactNode;
  error?: string;
  hint?: string;
};

export function TextareaField({ label, error, hint, className, id, ...rest }: TextareaFieldProps) {
  return (
    <FieldWrapper label={label} htmlFor={id} error={error} hint={hint}>
      <textarea id={id} className={cn(controlClasses, error && "border-error focus:border-error focus:ring-error", className)} {...rest} />
    </FieldWrapper>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: ReactNode;
  error?: string;
  hint?: string;
  compact?: boolean;
  children: ReactNode;
};

export function SelectField({ label, error, hint, compact, className, id, children, ...rest }: SelectFieldProps) {
  return (
    <FieldWrapper label={label} htmlFor={id} error={error} hint={hint}>
      <select id={id} className={cn(compact ? compactControlClasses : controlClasses, className)} {...rest}>
        {children}
      </select>
    </FieldWrapper>
  );
}

type CheckboxFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
  compact?: boolean;
};

export function CheckboxField({ label, compact, className, ...rest }: CheckboxFieldProps) {
  return (
    <label
      className={cn(
        "flex items-center gap-2",
        compact ? "type-label-medium text-on-surface-variant" : "type-body-medium text-on-surface"
      )}
    >
      <input type="checkbox" className={cn("size-4 accent-primary", className)} {...rest} />
      {label}
    </label>
  );
}

// MD3 switch (https://m3.material.io/components/switch) — for boolean
// settings (watermarking, email notifications). Pure CSS on a hidden
// checkbox: 52x32 track, thumb grows 16→24px and adopts on-primary when
// selected, exactly per spec.
type SwitchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  description?: ReactNode;
};

export function SwitchField({ label, description, className, ...rest }: SwitchFieldProps) {
  return (
    <label className={cn("flex cursor-pointer items-start justify-between gap-4", className)}>
      <span>
        <span className="block type-body-large text-on-surface">{label}</span>
        {description && <span className="mt-0.5 block type-body-medium text-on-surface-variant">{description}</span>}
      </span>
      <span className="relative inline-block h-8 w-13 shrink-0">
        <input type="checkbox" className="peer sr-only" {...rest} />
        <span
          className="absolute inset-0 rounded-full border-2 border-outline bg-surface-container-highest transition-colors
            peer-checked:border-primary peer-checked:bg-primary
            after:absolute after:left-1.5 after:top-1/2 after:h-4 after:w-4 after:-translate-y-1/2 after:rounded-full after:bg-outline after:transition-all after:content-['']
            peer-checked:after:left-6 peer-checked:after:h-6 peer-checked:after:w-6 peer-checked:after:bg-on-primary
            peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
        />
      </span>
    </label>
  );
}
