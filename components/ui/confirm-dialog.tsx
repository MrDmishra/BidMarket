"use client";

import { useId, useRef, type ReactNode } from "react";
import { Button, type ButtonVariant } from "@/components/ui/button";

type ConfirmDialogProps = {
  triggerLabel: string;
  title: string;
  consequence: ReactNode;
  confirmLabel: string;
  variant?: ButtonVariant;
  onConfirm: () => void;
};

/** The native dialog element supplies focus trapping, Escape and a backdrop. */
export function ConfirmDialog({
  triggerLabel,
  title,
  consequence,
  confirmLabel,
  variant = "danger",
  onConfirm,
}: ConfirmDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <Button variant={variant} onClick={() => dialog.current?.showModal()}>
        {triggerLabel}
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="m-auto max-w-md rounded-panel border border-line bg-surface p-5 text-ink shadow-lg backdrop:bg-ink/50"
      >
        <h2 id={titleId} className="text-xl font-bold">
          {title}
        </h2>
        <div className="my-3 text-muted">{consequence}</div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => dialog.current?.close()}>
            Cancel
          </Button>
          <Button
            variant={variant}
            onClick={() => {
              dialog.current?.close();
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </dialog>
    </>
  );
}
