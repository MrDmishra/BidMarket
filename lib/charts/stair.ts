export type StairPoint = { x: number; y: number; paise: number };

type StairBox = {
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
};

/** Reduces a bid history to the falling L1 price and places each step on one linear scale. */
export function buildStair(bidsPaise: number[], box: StairBox): StairPoint[] {
  const l1History: number[] = [];
  for (const bid of bidsPaise) {
    const current = l1History.at(-1);
    if (current === undefined || bid < current) l1History.push(bid);
  }
  if (l1History.length < 2) return [];

  const high = l1History[0] as number;
  const low = l1History.at(-1) as number;
  const plotWidth = box.width - box.left - box.right;
  const plotHeight = box.height - box.top - box.bottom;

  return l1History.map((paise, index) => ({
    paise,
    x: box.left + (index * plotWidth) / (l1History.length - 1),
    y: box.top + ((high - paise) / (high - low)) * plotHeight,
  }));
}

export function stairPath(points: StairPoint[]): string {
  return points
    .map((point, index) => (index === 0 ? `M${point.x} ${point.y}` : `H${point.x}V${point.y}`))
    .join("");
}
