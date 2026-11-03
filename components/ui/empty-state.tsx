import type { ReactNode } from "react";

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-panel border border-line bg-surface p-7 text-center">
      <p className="text-muted">{message}</p>
      {action}
    </div>
  );
}
