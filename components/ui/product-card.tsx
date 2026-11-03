import Link from "next/link";
import { formatInr } from "@/lib/money";

type ProductCardProps = {
  href: string;
  title: string;
  location: string;
  netPaise: number;
  mrpPaise: number;
  discountPercent: number;
  unit: string;
  imageUrl?: string;
};

/** Seller names stay out of this card until an order is accepted. */
export function ProductCard({
  href,
  title,
  location,
  netPaise,
  mrpPaise,
  discountPercent,
  unit,
  imageUrl,
}: ProductCardProps) {
  return (
    <Link
      href={href}
      className="flex flex-col overflow-hidden rounded-panel border border-line bg-surface text-ink no-underline hover:border-accent"
    >
      <div
        className="aspect-[16/10] max-w-full bg-sunk bg-cover bg-center"
        style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
      />
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="leading-snug font-semibold">{title}</span>
        <span className="text-sm text-muted">{location}</span>
        <span className="mt-auto flex flex-wrap items-baseline gap-2 pt-1">
          <span className="font-mono text-[17px] font-semibold tabular-nums">
            {formatInr(netPaise)}
          </span>
          <span className="font-mono text-sm text-muted tabular-nums line-through">
            {formatInr(mrpPaise)}
          </span>
          <span className="text-sm font-semibold text-ok">{discountPercent}% off</span>
        </span>
        <span className="text-sm text-muted">per {unit}, all-inclusive</span>
      </div>
    </Link>
  );
}
