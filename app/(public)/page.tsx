import { AuctionStair } from "@/components/ui/auction-stair";
import { ButtonLink } from "@/components/ui/button";
import { formatInr } from "@/lib/money";
import { PROPOSED_FEES } from "@/modules/billing";

const EXAMPLE_BIDS_PAISE = [64_000, 63_200, 62_100, 61_400, 60_800];

const METHODS = [
  {
    title: "Direct order",
    body: "For small, repeat purchases. Pick a listed product and order at the published price.",
    fee: `Under ${formatInr(PROPOSED_FEES.limitOrgPaise)}. Fee ${PROPOSED_FEES.directFeeBps / 100}%.`,
  },
  {
    title: "Bid",
    body: "Sellers send sealed prices against your requirement. You review them after closing and choose one.",
    fee: `Any value. Fee ${PROPOSED_FEES.tenderFeeBps / 100}%.`,
  },
  {
    title: "Reverse auction",
    body: "Sellers undercut each other live. The lowest valid price at closing becomes L1 and gets the first offer.",
    fee: `Any value. Fee ${PROPOSED_FEES.tenderFeeBps / 100}%.`,
  },
  {
    title: "Bid to RA",
    body: "Collect sealed bids first, remove the costliest sellers, then run an auction among those left.",
    fee: `Any value. Fee ${PROPOSED_FEES.tenderFeeBps / 100}%.`,
  },
];

const ORDER_STEPS = [
  ["Verify", "Buyers and sellers pass PAN, GSTIN and bank checks."],
  ["Source", "Order directly, or publish a tender and collect prices."],
  ["Accept", "The seller accepts and pays the platform fee. Contact details open up."],
  ["Deliver", "The seller dispatches with bill, e-way bill and transport details."],
  ["Close", "The buyer confirms receipt. An acceptance report closes the order."],
];

export default function HomePage() {
  return (
    <main>
      <section className="bg-band text-band-ink">
        <div className="page-wrap grid items-center gap-9 py-11 md:grid-cols-2">
          <div className="flex flex-col items-start gap-4">
            <span className="rounded-pill bg-band-2 px-2 py-0.5 text-xs font-semibold text-gold">
              In development
            </span>
            <h1 className="text-[clamp(2rem,1.4rem+2.6vw,3.2rem)] font-extrabold">
              Buy for your business at the price sellers compete to give you.
            </h1>
            <p className="max-w-xl text-lg text-band-muted">
              Order directly from verified sellers, invite bids, or run a reverse auction. Every
              order ends with a contract and an acceptance report you can audit.
            </p>
            <ButtonLink href="/how-it-works" variant="gold">
              See how it works
            </ButtonLink>
          </div>
          <figure className="flex min-w-0 flex-col gap-2 rounded-panel bg-band-2 p-5">
            <figcaption className="text-xs font-semibold tracking-wide text-band-muted uppercase">
              Illustration with example prices
            </figcaption>
            <p className="font-mono text-4xl font-semibold text-gold tabular-nums">
              {formatInr(60_800)}
              <span className="ml-2 font-sans text-sm font-normal text-band-muted">
                example L1, per metre
              </span>
            </p>
            <div className="text-gold">
              <AuctionStair bidsPaise={EXAMPLE_BIDS_PAISE} />
            </div>
          </figure>
        </div>
      </section>
      <div className="page-wrap flex flex-col gap-10 py-10">
        <section className="flex flex-col gap-4" aria-labelledby="methods">
          <h2 id="methods" className="text-3xl font-bold">
            Four ways to buy
          </h2>
          <div className="grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {METHODS.map((method) => (
              <div key={method.title} className="flex flex-col gap-2 bg-surface p-5">
                <h3 className="text-lg font-bold">{method.title}</h3>
                <p className="text-muted">{method.body}</p>
                <p className="mt-auto text-sm font-medium">{method.fee}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted">
            Proposed fees, plus GST. They may change before launch.
          </p>
        </section>
        <section className="flex flex-col gap-4" aria-labelledby="order-steps">
          <h2 id="order-steps" className="text-3xl font-bold">
            How an order runs
          </h2>
          <ol className="grid list-none gap-4 [counter-reset:step] sm:grid-cols-2 lg:grid-cols-5">
            {ORDER_STEPS.map(([title, body]) => (
              <li
                key={title}
                className="flex flex-col gap-1 [counter-increment:step] before:font-mono before:text-sm before:font-semibold before:text-accent before:content-[counter(step)]"
              >
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="text-sm text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
