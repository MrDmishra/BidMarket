import type { ReactNode } from "react";

export function ActionPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside
      aria-label={title}
      className="flex min-w-0 flex-col gap-3 rounded-panel border border-line bg-surface p-5"
    >
      <h3 className="text-lg font-bold">{title}</h3>
      {children}
    </aside>
  );
}
