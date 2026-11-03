import { StatusPill, type PillTone } from "@/components/ui/status-pill";
import { ButtonLink } from "@/components/ui/button";
import { formatInr } from "@/lib/money";

const STATUS_SAMPLES: { tone: PillTone; label: string }[] = [
  { tone: "neutral", label: "Draft" },
  { tone: "info", label: "Bidding open" },
  { tone: "warn", label: "Auction live" },
  { tone: "ok", label: "Completed" },
  { tone: "bad", label: "Rejected" },
];

export default function HomePage() {
  return (
    <main>
      <section className="bg-band text-band-ink">
        <div className="page-wrap flex flex-col items-start gap-5 py-12">
          <span className="rounded-pill bg-band-2 px-2 py-0.5 text-xs font-semibold text-gold">
            In development
          </span>
          <h1 className="max-w-3xl text-[clamp(2rem,1.4rem+2.6vw,3.2rem)] font-extrabold">
            Buy for your business at the price sellers compete to give you.
          </h1>
          <p className="max-w-2xl text-lg text-band-muted">
            A private marketplace for direct orders, tenders and reverse auctions.
          </p>
          <ButtonLink href="/signup" variant="gold">
            Register interest
          </ButtonLink>
        </div>
      </section>
      <section className="page-wrap flex flex-col gap-4 py-10" aria-labelledby="foundation">
        <h2 id="foundation" className="text-2xl font-bold">
          Design foundation
        </h2>
        <div className="flex flex-wrap gap-2">
          {STATUS_SAMPLES.map((sample) => (
            <StatusPill key={sample.label} {...sample} />
          ))}
        </div>
        <p className="font-mono text-lg tabular-nums">{formatInr(12_500_000)} example value</p>
      </section>
    </main>
  );
}
