"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { SelectField, TextField, TextareaField } from "@/components/ui/field";
import { apiWrite } from "@/lib/api/client";

type Option = { id: string; label: string };
type TenderFormProps = {
  product: { id: string; title: string } | null;
  categories: Option[];
  addresses: Option[];
  earliestClose: string;
};

function parseSpecs(text: string) {
  return text
    .split("\n")
    .map((line) => line.split(":"))
    .filter((parts) => parts.length >= 2)
    .map(([label, ...value]) => ({ label: label ?? "", value: value.join(":") }));
}

export function TenderForm({ product, categories, addresses, earliestClose }: TenderFormProps) {
  const router = useRouter();
  const [terms, setTerms] = useState("advance");
  const [tenderType, setTenderType] = useState("bid");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "");
    setPending(true);
    setError("");
    setFields({});
    const shared = {
      quantity: text("quantity"),
      paymentTerms: terms,
      creditDays: terms === "credit" ? text("creditDays") : "",
      consigneeName: text("consigneeName"),
      consigneeGstin: text("consigneeGstin"),
      consigneeAddressId: text("consigneeAddressId"),
      contractMonths: text("contractMonths"),
      type: tenderType,
      ...(tenderType === "ra" ? {} : { bidEndsAt: text("bidEndsAt") }),
      ...(tenderType === "bid"
        ? {}
        : { raStartsAt: text("raStartsAt"), raEndsAt: text("raEndsAt") }),
      minBids: text("minBids"),
      extensionsAllowed: text("extensionsAllowed"),
      extensionHours: text("extensionHours"),
    };
    const json = product
      ? { ...shared, kind: "regular", productId: product.id }
      : {
          ...shared,
          kind: "custom",
          categoryId: text("categoryId"),
          title: text("title"),
          unit: text("unit"),
          estimateUnit: text("estimateUnit"),
          specs: parseSpecs(text("specs")),
        };
    const response = await apiWrite("/api/v1/buyer/tenders", { json }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as {
      data?: { tenderId?: string };
      error?: { message?: string; fields?: Record<string, string> };
    } | null;
    setPending(false);
    if (response?.ok && body?.data?.tenderId) {
      router.push(`/buyer/tenders/${body.data.tenderId}`);
      return;
    }
    setFields(body?.error?.fields ?? {});
    setError(body?.error?.message ?? "We could not save this tender. Try again.");
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="flex max-w-xl flex-col gap-3">
      {error ? <Banner tone="bad">{error}</Banner> : null}
      {product ? (
        <p>
          Tender for <b>{product.title}</b>
        </p>
      ) : (
        <>
          <TextField id="title" name="title" label="What you need" error={fields.title} />
          <SelectField id="category" name="categoryId" label="Category">
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </SelectField>
          <TextField
            id="unit"
            name="unit"
            label="Unit"
            hint="Such as pc or kg."
            error={fields.unit}
          />
          <TextField
            id="estimate"
            name="estimateUnit"
            label="Estimated unit price (₹)"
            inputMode="decimal"
            error={fields.estimateUnit}
          />
          <TextareaField
            id="specs"
            name="specs"
            label="Specifications"
            hint="One per line, such as Material: Brass."
          />
        </>
      )}
      <TextField
        id="quantity"
        name="quantity"
        label="Quantity"
        inputMode="decimal"
        error={fields.quantity}
      />
      <TextField
        id="contract-months"
        name="contractMonths"
        label="Contract period (months)"
        inputMode="numeric"
        defaultValue="1"
        error={fields.contractMonths}
      />
      <TextField
        id="consignee-name"
        name="consigneeName"
        label="Consignee"
        error={fields.consigneeName}
      />
      <TextField
        id="consignee-gstin"
        name="consigneeGstin"
        label="Consignee GSTIN"
        error={fields.consigneeGstin}
      />
      <SelectField id="consignee-address" name="consigneeAddressId" label="Delivery address">
        {addresses.map((address) => (
          <option key={address.id} value={address.id}>
            {address.label}
          </option>
        ))}
      </SelectField>
      <SelectField
        id="tender-terms"
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
          id="tender-credit"
          name="creditDays"
          label="Credit days"
          inputMode="numeric"
          error={fields.creditDays}
        />
      ) : null}
      <SelectField
        id="tender-type"
        name="type"
        label="Tender type"
        value={tenderType}
        onChange={(event) => setTenderType(event.target.value)}
      >
        <option value="bid">Sealed bid</option>
        <option value="ra">Reverse auction</option>
        <option value="bid_to_ra">Sealed bid, then reverse auction</option>
      </SelectField>
      {tenderType === "bid_to_ra" ? (
        <p className="text-sm text-muted">
          After sealed bidding closes, you remove the highest bidder or the highest half. The
          sellers left then compete in the auction.
        </p>
      ) : null}
      {tenderType === "ra" ? null : (
        <TextField
          id="bid-ends"
          name="bidEndsAt"
          type="datetime-local"
          label={
            tenderType === "bid" ? "Bidding ends (India time)" : "Sealed bidding ends (India time)"
          }
          min={earliestClose}
          defaultValue={earliestClose}
          error={fields.bidEndsAt}
        />
      )}
      {tenderType === "bid" ? null : (
        <>
          <TextField
            id="ra-starts"
            name="raStartsAt"
            type="datetime-local"
            label="Auction starts (India time)"
            hint={
              tenderType === "ra"
                ? "At least 1 hour from now, so sellers get notice."
                : "At least 1 hour after sealed bidding ends, so you have time to shortlist."
            }
            min={earliestClose}
            defaultValue={tenderType === "ra" ? earliestClose : undefined}
            error={fields.raStartsAt}
          />
          <TextField
            id="ra-ends"
            name="raEndsAt"
            type="datetime-local"
            label="Auction ends (India time)"
            hint="At least 15 minutes after the start. Late bids add time."
            min={earliestClose}
            error={fields.raEndsAt}
          />
        </>
      )}
      <TextField
        id="min-bids"
        name="minBids"
        label="Minimum bids"
        inputMode="numeric"
        defaultValue="1"
        error={fields.minBids}
      />
      <TextField
        id="extensions"
        name="extensionsAllowed"
        label="Extensions if too few bids"
        inputMode="numeric"
        defaultValue="0"
        error={fields.extensionsAllowed}
      />
      <TextField
        id="extension-hours"
        name="extensionHours"
        label="Hours per extension"
        inputMode="numeric"
        defaultValue="24"
        error={fields.extensionHours}
      />
      <Button type="submit" disabled={pending}>
        Save tender
      </Button>
    </form>
  );
}
