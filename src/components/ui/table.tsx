import { cn } from "@/lib/cn";
import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

// Standardizes the table shell used on the dashboard, reports run page,
// and audit log — including the overflow-x-auto wrapper every table
// needs (see globals.css comment on why: body is a flex column and wide
// tables can otherwise blow out the whole page's width on mobile).
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-slate-200 text-slate-500">{children}</tr>
    </thead>
  );
}

export function Th({ className, children, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn("whitespace-nowrap px-3 py-2", className)} {...rest}>
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
  return <tr className="border-b border-slate-100">{children}</tr>;
}

export function TableEmptyState({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-4 text-center text-slate-400">
        {message}
      </td>
    </tr>
  );
}
