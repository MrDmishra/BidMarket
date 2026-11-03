import { buildStair, stairPath } from "@/lib/charts/stair";
import { formatInr } from "@/lib/money";

const BOX = { width: 440, height: 130, left: 8, right: 70, top: 14, bottom: 14 };

/** Draws in currentColor, so its parent decides the color for each surface. */
export function AuctionStair({ bidsPaise }: { bidsPaise: number[] }) {
  const points = buildStair(bidsPaise, BOX);
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return null;

  return (
    <svg
      viewBox={`0 0 ${BOX.width} ${BOX.height}`}
      className="block h-auto w-full"
      role="img"
      aria-label={`Lowest price fell from ${formatInr(first.paise)} to ${formatInr(last.paise)} across ${points.length} price changes`}
    >
      <path d={stairPath(points)} fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx={last.x} cy={last.y} r="4.5" fill="currentColor" />
      <text
        x={first.x + 6}
        y={first.y + 16}
        fontSize="11"
        fill="currentColor"
        className="font-mono"
      >
        {formatInr(first.paise)}
      </text>
      <text x={last.x + 9} y={last.y + 4} fontSize="11" fill="currentColor" className="font-mono">
        {formatInr(last.paise)}
      </text>
    </svg>
  );
}
