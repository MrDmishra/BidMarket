const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export type CountdownTone = "normal" | "warn" | "bad" | "ended";

export function formatRemaining(remainingMs: number): string {
  if (remainingMs <= 0) return "Ended";
  const days = Math.floor(remainingMs / DAY);
  const hours = Math.floor((remainingMs % DAY) / HOUR);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((remainingMs % HOUR) / MINUTE);
  const seconds = Math.floor((remainingMs % MINUTE) / SECOND);
  const clock = `${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  return hours > 0 ? `${hours}h ${clock}` : clock;
}

export function countdownTone(remainingMs: number): CountdownTone {
  if (remainingMs <= 0) return "ended";
  if (remainingMs < MINUTE) return "bad";
  if (remainingMs < 10 * MINUTE) return "warn";
  return "normal";
}
