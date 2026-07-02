import { cn } from "@/lib/cn";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

// Audit found three competing input padding scales (px-3 py-2, px-2 py-1,
// mixed) and two label sizes across the app. One shared control-class
// string + one "compact" variant (for dense inline filter/settings rows)
// replaces all of them.
const controlClasses = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
const compactControlClasses = "rounded-md border border-slate-300 px-2 py-1 text-sm";

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
        <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
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
      <input id={id} className={cn(compact ? compactControlClasses : controlClasses, className)} {...rest} />
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
      <textarea id={id} className={cn(controlClasses, className)} {...rest} />
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
    <label className={cn("flex items-center gap-2", compact ? "text-xs text-slate-500" : "text-sm text-slate-700")}>
      <input type="checkbox" className={className} {...rest} />
      {label}
    </label>
  );
}
