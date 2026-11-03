import type { ReactNode } from "react";

export type BannerTone = "info" | "warn" | "bad";

const TONES: Record<BannerTone, string> = {
  info: "bg-info-bg text-info",
  warn: "bg-warn-bg text-warn",
  bad: "bg-bad-bg text-bad",
};

export function Banner({ tone = "info", children }: { tone?: BannerTone; children: ReactNode }) {
  return (
    <div
      role={tone === "bad" ? "alert" : "status"}
      className={`rounded-control px-3.5 py-2.5 text-[15px] ${TONES[tone]}`}
    >
      {children}
    </div>
  );
}
