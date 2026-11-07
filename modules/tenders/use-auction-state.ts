"use client";

import { useEffect, useRef, useState } from "react";

const POLL_MS = 3_000;

type AuctionFeed<State> = { state: State | null; connected: boolean; lastUpdated: string };

/** Keeps one view of the auction fresh. Polling is the record, so a dropped request only pauses bidding. */
export function useAuctionState<State extends { seq: number }>(url: string) {
  const [feed, setFeed] = useState<AuctionFeed<State>>({
    state: null,
    connected: true,
    lastUpdated: "",
  });
  const latestSeq = useRef(-1);

  useEffect(() => {
    let stopped = false;

    async function refresh() {
      const response = await fetch(url, { cache: "no-store" }).catch(() => null);
      const body = (await response?.json().catch(() => null)) as { data?: State } | null;
      if (stopped) return;
      if (response?.ok && body?.data) {
        const state = body.data;
        if (state.seq < latestSeq.current) return;
        latestSeq.current = state.seq;
        setFeed({ state, connected: true, lastUpdated: new Date().toLocaleTimeString("en-IN") });
      } else {
        setFeed((current) => ({ ...current, connected: false }));
      }
    }

    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [url]);

  return feed;
}
