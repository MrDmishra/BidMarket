"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { apiWrite } from "@/lib/api/client";
import { OrderFileField } from "@/modules/orders/order-file-field";

export function ReceiveForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [fileId, setFileId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function confirm() {
    if (!fileId) {
      setError("Upload a delivery photo first.");
      return;
    }
    setPending(true);
    setError("");
    const response = await apiWrite(`/api/v1/orders/${orderId}/receive`, {
      json: { fileId },
    }).catch(() => null);
    setPending(false);
    if (response?.ok) router.refresh();
    else setError("We could not confirm receipt. Try again.");
  }

  return (
    <div className="flex flex-col items-start gap-3">
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <OrderFileField
        id="delivery-proof"
        label="Delivery photo"
        accept="image/jpeg,image/png,image/webp"
        acceptLabel="JPEG, PNG or WebP"
        onUploaded={setFileId}
      />
      <Button type="button" disabled={pending} onClick={() => void confirm()}>
        Confirm receipt
      </Button>
    </div>
  );
}
