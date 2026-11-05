"use client";

import { useRouter } from "next/navigation";
import { ActionPanel } from "@/components/ui/action-panel";
import { Banner } from "@/components/ui/banner";
import { LiveAuctionPanel, type BidResult } from "@/components/ui/live-auction-panel";
import { SkeletonRows } from "@/components/ui/skeleton";
import { apiWrite } from "@/lib/api/client";
import { formatInr } from "@/lib/money";
import type { SellerAuction } from "@/modules/tenders/schemas";
import { closingText } from "@/modules/tenders/tender-labels";
import { useAuctionState } from "@/modules/tenders/use-auction-state";

const NETWORK_RETRIES = 1;

type BidFailure = { error?: { message?: string } };

/** Retries keep the same key, so a bid whose reply was lost cannot be placed twice. */
async function sendBid(tenderId: string, unitPaise: number): Promise<BidResult> {
  const bidKey = crypto.randomUUID();
  for (let attempt = 0; attempt <= NETWORK_RETRIES; attempt += 1) {
    const response = await apiWrite(`/api/v1/seller/tenders/${tenderId}/auction/bids`, {
      json: { unitPaise, bidKey },
    }).catch(() => null);
    if (!response) continue;
    const body = (await response.json().catch(() => null)) as
      ({ data?: { rank: number } } & BidFailure) | null;
    if (response.ok && body?.data) return { accepted: true, rank: body.data.rank };
    return { accepted: false, message: body?.error?.message ?? "Your bid was not accepted." };
  }
  return { accepted: false, message: "We could not reach the server. Your bid was not confirmed." };
}

type SellerAuctionPanelProps = { tenderId: string; unit: string };

export function SellerAuctionPanel({ tenderId, unit }: SellerAuctionPanelProps) {
  const router = useRouter();
  const { state, connected, lastUpdated } = useAuctionState<SellerAuction>(
    `/api/v1/seller/tenders/${tenderId}/auction`,
  );
  if (!state) {
    return connected ? (
      <SkeletonRows rows={4} label="Loading the auction" />
    ) : (
      <Banner tone="bad">We could not load this auction. Refresh the page to try again.</Banner>
    );
  }

  const serverNowMs = new Date(state.serverNow).getTime();
  const startsAtMs = new Date(state.startsAt).getTime();
  const endsAtMs = new Date(state.endsAt).getTime();
  const notStarted = serverNowMs < startsAtMs;
  const closed =
    serverNowMs >= endsAtMs || !["auction_scheduled", "auction"].includes(state.status);

  if (notStarted) {
    return (
      <ActionPanel title="Reverse auction">
        <p>This auction starts {closingText(state.startsAt)}.</p>
      </ActionPanel>
    );
  }
  if (!state.eligible && !closed) {
    return <Banner tone="warn">Your account or products are not eligible for this auction.</Banner>;
  }
  if (closed) {
    return (
      <ActionPanel title="Auction closed">
        {state.myBidPaise === null ? null : (
          <p>
            Your last bid: <b className="font-mono">{formatInr(state.myBidPaise)}</b>
          </p>
        )}
        <p className="text-muted">The buyer now reviews the results.</p>
      </ActionPanel>
    );
  }

  return (
    <LiveAuctionPanel
      idPrefix="auction"
      unit={unit}
      l1Paise={state.l1Paise ?? undefined}
      maxAllowedPaise={state.maxAllowedPaise ?? undefined}
      yourBidPaise={state.myBidPaise ?? undefined}
      rank={state.rank ?? undefined}
      bidsPaise={state.bidsPaise}
      endsAtMs={endsAtMs}
      serverNowMs={serverNowMs}
      connection={connected ? "live" : "reconnecting"}
      lastUpdated={lastUpdated}
      submitBid={async (unitPaise) => {
        const result = await sendBid(tenderId, unitPaise);
        router.refresh();
        return result;
      }}
    />
  );
}
