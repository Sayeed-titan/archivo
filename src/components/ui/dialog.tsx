"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/icon";
import { Button, type ButtonProps } from "./button";

// MD3 basic dialog (https://m3.material.io/components/dialogs) on the
// native <dialog> element: corner-extra-large, surface-container-high,
// optional hero icon, actions right-aligned as text buttons. Esc and
// scrim clicks close it.
export function Dialog({
  open,
  onClose,
  icon,
  headline,
  children,
  actions,
  className,
}: {
  open: boolean;
  onClose: () => void;
  icon?: string;
  headline: string;
  children?: ReactNode;
  actions: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // A click on the backdrop registers on the <dialog> itself.
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[min(calc(100vw-3rem),28rem)] rounded-xl bg-surface-container-high p-6 text-on-surface shadow-elevation-3 backdrop:bg-scrim/40",
        className
      )}
    >
      {icon && (
        <div className="mb-4 flex shrink-0 justify-center text-secondary">
          <Icon name={icon} size={24} />
        </div>
      )}
      <h2 className={cn("shrink-0 type-headline-small", icon && "text-center")}>{headline}</h2>
      {children && (
        <div className="mt-4 min-h-0 flex-1 type-body-medium text-on-surface-variant">{children}</div>
      )}
      <div className="mt-6 flex shrink-0 flex-wrap justify-end gap-2">{actions}</div>
    </dialog>
  );
}

// Drop-in destructive-action guard: renders a Button; clicking it opens a
// confirm dialog instead of firing immediately. On confirm it submits the
// nearest enclosing <form> (all destructive actions in this app are
// server-action forms), replacing the old browser confirm() flow.
export function ConfirmSubmitButton({
  dialogTitle,
  dialogBody,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  dialogIcon = "warning",
  ...buttonProps
}: Omit<ButtonProps, "type" | "onClick" | "href"> & {
  dialogTitle: string;
  dialogBody: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  dialogIcon?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);

  return (
    <span ref={triggerRef} className="contents">
      <Button {...buttonProps} type="button" onClick={() => setOpen(true)} />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        icon={dialogIcon}
        headline={dialogTitle}
        actions={
          <>
            <Button variant="text" type="button" onClick={() => setOpen(false)}>
              {cancelLabel}
            </Button>
            <Button
              variant="text-error"
              type="button"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.closest("form")?.requestSubmit();
              }}
            >
              {confirmLabel}
            </Button>
          </>
        }
      >
        {dialogBody}
      </Dialog>
    </span>
  );
}
