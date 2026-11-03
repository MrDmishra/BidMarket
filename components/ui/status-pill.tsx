export type PillTone = "neutral" | "info" | "warn" | "ok" | "bad";

const TONES: Record<PillTone, string> = {
  neutral: "bg-sunk text-muted",
  info: "bg-info-bg text-info",
  warn: "bg-warn-bg text-warn",
  ok: "bg-ok-bg text-ok",
  bad: "bg-bad-bg text-bad",
};

export function StatusPill({ tone = "neutral", label }: { tone?: PillTone; label: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-pill px-2 py-0.5 text-xs font-semibold ${TONES[tone]}`}
    >
      {label}
    </span>
  );
}
