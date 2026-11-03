import type { ReactNode } from "react";

export function PreviewSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-line pt-6" aria-label={title}>
      <h2 className="text-2xl font-bold">{title}</h2>
      {children}
    </section>
  );
}
