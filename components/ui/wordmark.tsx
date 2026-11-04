import Link from "next/link";
import { useId } from "react";

const B_SHAPE =
  "M12 7H37C46 7 52 12.5 52 20.5C52 25 50 28.8 46.5 31C50.8 33.2 54 37.5 54 43.5C54 52 47 57 38 57H12Z";

export function Wordmark() {
  const gavelMaskId = useId();

  return (
    <Link
      href="/"
      aria-label="Bid Market home"
      className="inline-flex items-center gap-2 font-display text-xl font-extrabold text-brand no-underline"
    >
      <svg viewBox="0 0 64 64" className="size-8" fill="currentColor" aria-hidden="true">
        {/* The gavel is cut out of the B, so the mark works on any background. */}
        <mask id={gavelMaskId}>
          <rect width="64" height="64" fill="white" />
          <g transform="rotate(-45 32 32)" fill="black">
            <rect x="3" y="33" width="34" height="6" rx="3" />
            <rect x="31.5" y="20.5" width="14" height="31" rx="4.5" />
          </g>
        </mask>
        <path d={B_SHAPE} mask={`url(#${gavelMaskId})`} />
      </svg>
      Bid Market
    </Link>
  );
}
