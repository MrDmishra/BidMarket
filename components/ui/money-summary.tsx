import { formatInr } from "@/lib/money";

type MoneySummaryProps = {
  valuePaise: number;
  feePaise: number;
  gstPaise: number;
  valueLabel?: string;
  feeLabel?: string;
};

/** The order value stays out of the total because goods are paid for off-platform. */
export function MoneySummary({
  valuePaise,
  feePaise,
  gstPaise,
  valueLabel = "Order value",
  feeLabel = "Platform fee",
}: MoneySummaryProps) {
  const rows = [
    { label: valueLabel, paise: valuePaise, muted: true },
    { label: feeLabel, paise: feePaise },
    { label: "GST", paise: gstPaise },
  ];

  return (
    <dl className="flex flex-col gap-1.5">
      {rows.map((row) => (
        <div
          key={row.label}
          className={`flex justify-between gap-4 ${row.muted ? "text-muted" : ""}`}
        >
          <dt>{row.label}</dt>
          <dd className="font-mono tabular-nums">{formatInr(row.paise)}</dd>
        </div>
      ))}
      <div className="flex justify-between gap-4 border-t border-line pt-1.5 font-semibold">
        <dt>Pay now</dt>
        <dd className="font-mono tabular-nums">{formatInr(feePaise + gstPaise)}</dd>
      </div>
    </dl>
  );
}
