export type Step = { label: string; date?: string; done: boolean };

export function Stepper({ steps }: { steps: Step[] }) {
  const currentIndex = steps.findIndex((step) => !step.done);

  return (
    <ol className="flex flex-wrap gap-1.5" aria-label="Progress">
      {steps.map((step, index) => (
        <li
          key={step.label}
          aria-current={index === currentIndex ? "step" : undefined}
          className={`min-w-28 flex-1 border-t-[3px] px-2.5 py-2 text-sm ${
            step.done ? "border-accent font-semibold text-ink" : "border-line text-muted"
          }`}
        >
          {step.label}
          {step.date ? <span className="block text-xs font-normal">{step.date}</span> : null}
          {step.done ? <span className="sr-only"> (complete)</span> : null}
        </li>
      ))}
    </ol>
  );
}
