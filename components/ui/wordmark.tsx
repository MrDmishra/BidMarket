import Link from "next/link";

export function Wordmark({ onBand = false }: { onBand?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Bid Market home"
      className={`inline-flex items-center gap-2 font-display text-xl font-extrabold no-underline ${
        onBand ? "text-band-ink" : "text-ink"
      }`}
    >
      <svg
        viewBox="0 0 28 28"
        className={`size-7 ${onBand ? "text-highlight" : "text-accent"}`}
        fill="currentColor"
        aria-hidden="true"
      >
        <rect x="2" y="3" width="6" height="22" rx="1" />
        <rect x="11" y="10" width="6" height="15" rx="1" />
        <rect x="20" y="17" width="6" height="8" rx="1" />
      </svg>
      Bid Market
    </Link>
  );
}
