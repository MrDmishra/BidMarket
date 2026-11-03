import type { ReactNode } from "react";

/** One column for reading pages, kept near 65 characters per line. */
export function ContentPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <main className="page-wrap flex flex-col gap-6 py-8 pb-12">
      <div className="flex max-w-3xl flex-col gap-2">
        <h1 className="text-3xl font-extrabold">{title}</h1>
        {intro ? <p className="text-lg text-muted">{intro}</p> : null}
      </div>
      {children}
    </main>
  );
}
