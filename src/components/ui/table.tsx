import { cn } from "@/lib/cn";
import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

// MD3-styled data table shell — including the overflow-x-auto wrapper
// every table needs (see globals.css comment on why: wide tables can
// otherwise blow out the whole page's width on mobile).
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border border-outline-variant bg-surface">
      <table className="w-full text-left type-body-medium">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-outline-variant bg-surface-container-low text-on-surface-variant">{children}</tr>
    </thead>
  );
}

export function Th({ className, children, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn("whitespace-nowrap px-3 py-2.5 type-label-large", className)} {...rest}>
      {children}
    </th>
  );
}

export function Td({ className, children, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("whitespace-nowrap px-3 py-2", className)} {...rest}>
      {children}
    </td>
  );
}

export function TableRow({ children }: { children: ReactNode }) {
  return <tr className="border-b border-outline-variant/60 transition-colors last:border-b-0 hover:bg-on-surface-8">{children}</tr>;
}

export function TableEmptyState({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-6 text-center type-body-medium text-on-surface-variant">
        {message}
      </td>
    </tr>
  );
}
