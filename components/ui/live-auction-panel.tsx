"use client";

import { useState, type FormEvent } from "react";
import { AuctionStair } from "@/components/ui/auction-stair";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/ui/countdown";
import { TextField } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status-pill";
import { formatInr, rupeesToPaise } from "@/lib/money";

export type BidResult = { accepted: true; rank: number } | { accepted: false; message: string };

type LiveAuctionPanelProps = {
  idPrefix: string;
  unit: string;
  l1Paise: number;
  maxAllowedPaise: number;
  yourBidPaise?: number;
  rank?: number;
  bidsPaise: number[];
  endsAtMs: number;
  serverNowMs: number;
  connection: "live" | "reconnecting" | "closed";
  lastUpdated?: string;
  submitBid: (unitPaise: number) => Promise<BidResult>;
};

/** A bid shows as placed only after submitBid returns the server's acceptance. */
export function LiveAuctionPanel({
  idPrefix,
  unit,
  l1Paise,
  maxAllowedPaise,
  yourBidPaise,
  rank,
  bidsPaise,
  endsAtMs,
  serverNowMs,
  connection,
  lastUpdated,
  submitBid,
}: LiveAuctionPanelProps) {
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmedRank, setConfirmedRank] = useState<number | null>(null);
  const shownRank = confirmedRank ?? rank;
  const canBid = connection === "live";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmedRank(null);

    let unitPaise: number;
    try {
      unitPaise = rupeesToPaise(price);
    } catch {
      setError("Enter a price such as 604.50.");
      return;
    }
    if (unitPaise > maxAllowedPaise) {
      setError(`Enter ${formatInr(maxAllowedPaise)} or less.`);
      return;
    }

    setError("");
    setSubmitting(true);
    const result = await submitBid(unitPaise);
    setSubmitting(false);
    if (result.accepted) {
      setConfirmedRank(result.rank);
      setPrice("");
    } else {
      setError(result.message);
    }
  }

  return (
    <section
      aria-label="Live auction"
      className="flex min-w-0 flex-col gap-3 rounded-panel border border-line bg-surface p-5"
    >
      {connection === "reconnecting" ? (
        <Banner tone="warn">
          Reconnecting. Bidding pauses until the latest price loads.
          {lastUpdated ? ` Last updated ${lastUpdated}.` : ""}
        </Banner>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusPill
          tone={connection === "closed" ? "neutral" : "warn"}
          label={connection === "closed" ? "Closed" : "Auction live"}
        />
        <span className="text-sm">
          Time left <Countdown endsAtMs={endsAtMs} serverNowMs={serverNowMs} />
        </span>
      </div>
      <div>
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">
          Current L1, per {unit}
        </p>
        <p className="font-mono text-4xl font-semibold tabular-nums">{formatInr(l1Paise)}</p>
      </div>
      {yourBidPaise !== undefined ? (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          Your last bid <b className="font-mono tabular-nums">{formatInr(yourBidPaise)}</b>
          {shownRank ? (
            <StatusPill tone={shownRank === 1 ? "ok" : "warn"} label={`You are L${shownRank}`} />
          ) : null}
        </p>
      ) : null}
      <div className="text-accent">
        <AuctionStair bidsPaise={bidsPaise} />
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2" noValidate>
        <TextField
          id={`${idPrefix}-price`}
          label={`Your price per ${unit} (₹)`}
          inputMode="decimal"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          disabled={!canBid}
          hint={`Enter ${formatInr(maxAllowedPaise)} or less.`}
          error={error}
        />
        <Button type="submit" loading={submitting} disabled={!canBid || !price}>
          {submitting ? "Confirming bid" : "Place bid"}
        </Button>
      </form>
      <p role="status" aria-live="polite" className="text-sm font-medium text-ok">
        {confirmedRank ? `Bid confirmed. You are L${confirmedRank}.` : ""}
      </p>
    </section>
  );
}
