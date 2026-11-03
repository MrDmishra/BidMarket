"use client";

import { useState } from "react";
import { TextField } from "@/components/ui/field";
import { subscriptionFeePaise } from "@/modules/billing/fee-schedule";
import { formatInr } from "@/lib/money";

export function SubscriptionCalculator() {
  const [turnover, setTurnover] = useState("40");
  const crore = Number(turnover);
  const valid = turnover.trim() !== "" && Number.isFinite(crore) && crore >= 0;

  return (
    <div className="flex max-w-md flex-col gap-3 rounded-panel border border-line bg-surface p-5">
      <h2 className="text-xl font-bold">Subscription calculator</h2>
      <TextField
        id="turnover-crore"
        label="Total turnover, last 3 years (₹ crore)"
        inputMode="decimal"
        value={turnover}
        onChange={(event) => setTurnover(event.target.value)}
        error={valid ? undefined : "Enter a number such as 40."}
      />
      <p>
        Annual fee{" "}
        <b data-testid="subscription-fee" className="font-mono tabular-nums">
          {valid ? formatInr(subscriptionFeePaise(crore)) : "—"}
        </b>{" "}
        plus GST
      </p>
    </div>
  );
}
