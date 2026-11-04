"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { apiWrite } from "@/lib/api/client";
import { OrderFileField } from "@/modules/orders/order-file-field";

const FILE_TYPES = "application/pdf,image/jpeg,image/png,image/webp";

export function DispatchForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [productBillFileId, setProductBillFileId] = useState<string | null>(null);
  const [ewayNumber, setEwayNumber] = useState("");
  const [ewayReason, setEwayReason] = useState("");
  const [transportNumber, setTransportNumber] = useState("");
  const [transportReason, setTransportReason] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!productBillFileId) {
      setError("Upload the product bill first.");
      return;
    }
    if ((!ewayNumber && !ewayReason) || (!transportNumber && !transportReason)) {
      setError("Enter a number for each bill, or say why it does not apply.");
      return;
    }
    setPending(true);
    setError("");
    const response = await apiWrite(`/api/v1/orders/${orderId}/dispatch`, {
      json: {
        productBillFileId,
        ewayBill: {
          referenceNo: ewayNumber || undefined,
          notApplicableReason: ewayReason || undefined,
        },
        transportBill: {
          referenceNo: transportNumber || undefined,
          notApplicableReason: transportReason || undefined,
        },
      },
    }).catch(() => null);
    setPending(false);
    if (response?.ok) router.refresh();
    else setError("We could not mark this as dispatched. Check the details and try again.");
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-3">
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <OrderFileField
        id="product-bill"
        label="Product bill"
        accept={FILE_TYPES}
        acceptLabel="PDF, JPEG, PNG or WebP"
        onUploaded={setProductBillFileId}
      />
      <TextField
        id="eway-number"
        label="E-way bill number"
        value={ewayNumber}
        onChange={(event) => setEwayNumber(event.target.value)}
      />
      <TextField
        id="eway-reason"
        label="Or why no e-way bill is needed"
        value={ewayReason}
        onChange={(event) => setEwayReason(event.target.value)}
      />
      <TextField
        id="transport-number"
        label="Transport bill number"
        value={transportNumber}
        onChange={(event) => setTransportNumber(event.target.value)}
      />
      <TextField
        id="transport-reason"
        label="Or why no transport bill is needed"
        value={transportReason}
        onChange={(event) => setTransportReason(event.target.value)}
      />
      <Button type="submit" disabled={pending}>
        Mark as dispatched
      </Button>
    </form>
  );
}
