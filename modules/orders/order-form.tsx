"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { MoneySummary } from "@/components/ui/money-summary";
import { apiWrite } from "@/lib/api/client";

type Address = { id: string; label: string; line1: string; city: string };
type Quote = { valuePaise: number; feePaise: number; gstPaise: number };
type ApiResult<Data> = {
  data?: Data;
  error?: { message?: string; fields?: Record<string, string> };
};

type OrderFormProps = {
  productId: string;
  unit: string;
  addresses: Address[];
  earliestDelivery: string;
  basePath: string;
};

export function OrderForm({
  productId,
  unit,
  addresses,
  earliestDelivery,
  basePath,
}: OrderFormProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState("1");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [terms, setTerms] = useState("advance");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function send<Data>(path: string, json: unknown) {
    setPending(true);
    setError("");
    setFields({});
    const response = await apiWrite(path, { json }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as ApiResult<Data> | null;
    setPending(false);
    if (response?.ok && body?.data) return body.data;
    setFields(body?.error?.fields ?? {});
    setError(body?.error?.message ?? "We could not do that. Try again.");
    return null;
  }

  async function review() {
    setQuote(await send<Quote>("/api/v1/orders/quote", { productId, quantity }));
  }

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const created = await send<{ orderId: string }>("/api/v1/orders", {
      productId,
      quantity,
      expectedDeliveryOn: form.get("expectedDeliveryOn"),
      consigneeName: form.get("consigneeName"),
      consigneeGstin: form.get("consigneeGstin"),
      deliveryAddressId: form.get("deliveryAddressId"),
      paymentTerms: terms,
      creditDays: terms === "credit" ? form.get("creditDays") : "",
    });
    if (created) router.push(`${basePath}/${created.orderId}`);
  }

  return (
    <form onSubmit={(event) => void placeOrder(event)} className="flex max-w-xl flex-col gap-3">
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <TextField
        id="quantity"
        label={`Quantity (${unit})`}
        inputMode="decimal"
        value={quantity}
        error={fields.quantity}
        onChange={(event) => {
          setQuantity(event.target.value);
          setQuote(null);
        }}
      />
      <TextField
        id="expected-delivery"
        name="expectedDeliveryOn"
        type="date"
        label="Expected delivery"
        min={earliestDelivery}
        defaultValue={earliestDelivery}
        error={fields.expectedDeliveryOn}
      />
      <TextField
        id="consignee-name"
        name="consigneeName"
        label="Consignee"
        hint="Who will receive the goods."
        error={fields.consigneeName}
      />
      <TextField
        id="consignee-gstin"
        name="consigneeGstin"
        label="Consignee GSTIN (optional)"
        error={fields.consigneeGstin}
      />
      <SelectField id="delivery-address" name="deliveryAddressId" label="Delivery address">
        {addresses.map((address) => (
          <option key={address.id} value={address.id}>
            {address.label}, {address.line1}, {address.city}
          </option>
        ))}
      </SelectField>
      <SelectField
        id="payment-terms"
        name="paymentTerms"
        label="Goods payment terms"
        value={terms}
        onChange={(event) => setTerms(event.target.value)}
      >
        <option value="advance">Advance</option>
        <option value="on_delivery">On delivery</option>
        <option value="credit">Credit</option>
      </SelectField>
      {terms === "credit" ? (
        <TextField
          id="credit-days"
          name="creditDays"
          label="Credit days"
          inputMode="numeric"
          error={fields.creditDays}
        />
      ) : null}
      {quote ? (
        <>
          <MoneySummary
            valuePaise={quote.valuePaise}
            feePaise={quote.feePaise}
            gstPaise={quote.gstPaise}
          />
          <p className="text-sm text-muted">
            You pay the seller for the goods directly. Bid Market collects only the platform fee.
          </p>
          <Button type="submit" disabled={pending}>
            Place order
          </Button>
        </>
      ) : (
        <Button type="button" disabled={pending} onClick={() => void review()}>
          Review fee
        </Button>
      )}
    </form>
  );
}
