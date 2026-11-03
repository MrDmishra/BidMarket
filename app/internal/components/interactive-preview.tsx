"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FileUpload } from "@/components/ui/file-upload";
import { LiveAuctionPanel, type BidResult } from "@/components/ui/live-auction-panel";
import { useToast } from "@/components/ui/toast";

const EXAMPLE_BIDS = [64_000, 63_200, 62_100, 61_400, 60_800];

async function refuseAbove600(unitPaise: number): Promise<BidResult> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return unitPaise > 60_000
    ? { accepted: false, message: "L1 changed to ₹600. Enter ₹597 or less." }
    : { accepted: true, rank: 1 };
}

export function InteractivePreview({ serverNowMs }: { serverNowMs: number }) {
  const showToast = useToast();
  const [confirmed, setConfirmed] = useState(false);
  const shared = {
    unit: "m",
    l1Paise: 60_800,
    maxAllowedPaise: 60_496,
    yourBidPaise: 61_400,
    rank: 2,
    bidsPaise: EXAMPLE_BIDS,
    serverNowMs,
    submitBid: refuseAbove600,
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => showToast("Tender published.")}>Show toast</Button>
        <ConfirmDialog
          triggerLabel="Reject award"
          title="Reject this award?"
          consequence="Rejecting blocks your account for 30 days and passes the award to the next seller."
          confirmLabel="Reject award"
          onConfirm={() => setConfirmed(true)}
        />
        {confirmed ? <span role="status">Dialog confirmed</span> : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FileUpload
          id="preview-idle"
          label="Product bill"
          accept=".pdf"
          maxBytes={10_485_760}
          acceptLabel="PDF"
        />
        <FileUpload
          id="preview-progress"
          label="Delivery proof"
          accept="image/*"
          maxBytes={5_242_880}
          acceptLabel="JPEG, PNG or WebP"
          progressPercent={60}
        />
        <FileUpload
          id="preview-error"
          label="Catalogue"
          accept=".pdf"
          maxBytes={1_048_576}
          acceptLabel="PDF"
          error="Upload failed. Your other details are saved. Try again."
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <LiveAuctionPanel
          idPrefix="preview-live"
          connection="live"
          endsAtMs={serverNowMs + 9 * 60_000}
          {...shared}
        />
        <LiveAuctionPanel
          idPrefix="preview-reconnect"
          connection="reconnecting"
          lastUpdated="2:41 PM IST"
          endsAtMs={serverNowMs + 45_000}
          {...shared}
        />
        <LiveAuctionPanel
          idPrefix="preview-closed"
          connection="closed"
          endsAtMs={serverNowMs - 1000}
          {...shared}
        />
      </div>
    </>
  );
}
