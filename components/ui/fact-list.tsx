import type { ReactNode } from "react";

export type Fact = { label: string; value: ReactNode; numeric?: boolean };

export function FactList({ facts }: { facts: Fact[] }) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-5 gap-y-3">
      {facts.map((fact) => (
        <div key={fact.label} className="min-w-0">
          <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{fact.label}</dt>
          <dd
            className={`font-medium wrap-anywhere ${fact.numeric ? "font-mono tabular-nums" : ""}`}
          >
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
