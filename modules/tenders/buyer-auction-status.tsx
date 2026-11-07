"use client";

import { ActionPanel } from "@/components/ui/action-panel";
import { Banner } from "@/components/ui/banner";
import { Countdown } from "@/components/ui/countdown";
import type { BuyerAuction } from "@/modules/tenders/schemas";
import { closingText } from "@/modules/tenders/tender-labels";
import { useAuctionState } from "@/modules/tenders/use-auction-state";

/** Shows the clock and bid count only. Prices stay hidden from buyers until the auction closes. */
export function BuyerAuctionStatus({ tenderId }: { tenderId: string }) {
  const { state, connected } = useAuctionState<BuyerAuction>(
    `/api/v1/buyer/tenders/${tenderId}/auction`,
  );
  if (!state) return null;
  const serverNowMs = new Date(state.serverNow).getTime();
  const started = serverNowMs >= new Date(state.startsAt).getTime();

  return (
    <ActionPanel title="Reverse auction">
      {connected ? null : <Banner tone="warn">Reconnecting to the auction.</Banner>}
      {state.paused ? (
        <Banner tone="warn">
          Paused by Bid Market because of a platform problem. The time lost is added back.
        </Banner>
      ) : null}
      {started ? (
        <p>
          Time left{" "}
          <Countdown endsAtMs={new Date(state.endsAt).getTime()} serverNowMs={serverNowMs} />
        </p>
      ) : (
        <p>Starts {closingText(state.startsAt)}.</p>
      )}
      <p>
        Bids so far: <b className="font-mono tabular-nums">{state.bidCount}</b>
      </p>
      <p className="text-sm text-muted">Prices stay hidden until the auction closes.</p>
    </ActionPanel>
  );
}
