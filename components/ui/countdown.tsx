"use client";

import { useEffect, useState } from "react";
import { countdownTone, formatRemaining, type CountdownTone } from "@/lib/time/countdown";

const TONES: Record<CountdownTone, string> = {
  normal: "",
  warn: "text-warn",
  bad: "text-bad",
  ended: "text-muted",
};

type CountdownProps = { endsAtMs: number; serverNowMs: number };

/** The server supplies the current time, so a wrong device clock cannot change the display. */
export function Countdown({ endsAtMs, serverNowMs }: CountdownProps) {
  const [remainingMs, setRemainingMs] = useState(endsAtMs - serverNowMs);

  useEffect(() => {
    const clockOffset = serverNowMs - Date.now();
    const timer = setInterval(() => setRemainingMs(endsAtMs - (Date.now() + clockOffset)), 1000);
    return () => clearInterval(timer);
  }, [endsAtMs, serverNowMs]);

  return (
    <span role="timer" className={`font-mono tabular-nums ${TONES[countdownTone(remainingMs)]}`}>
      {formatRemaining(remainingMs)}
    </span>
  );
}
