import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionPanel } from "@/components/ui/action-panel";
import { Banner } from "@/components/ui/banner";
import { Button, ButtonLink } from "@/components/ui/button";
import { Countdown } from "@/components/ui/countdown";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FactList } from "@/components/ui/fact-list";
import { SelectField, TextareaField, TextField } from "@/components/ui/field";
import { MessageThread } from "@/components/ui/message-thread";
import { MoneySummary } from "@/components/ui/money-summary";
import { PreviewSection } from "@/components/ui/preview-section";
import { ProductCard } from "@/components/ui/product-card";
import { SkeletonRows } from "@/components/ui/skeleton";
import { StatusPill, type PillTone } from "@/components/ui/status-pill";
import { Stepper } from "@/components/ui/stepper";
import { ToastProvider } from "@/components/ui/toast";
import { getServerEnv } from "@/lib/env/server";
import { serverNowMs as readServerNow } from "@/lib/time/server-now";
import { InteractivePreview } from "./interactive-preview";

export const metadata: Metadata = { title: "Components" };
export const dynamic = "force-dynamic";

type ExampleRow = { reference: string; item: string; value: string };

const ROWS: ExampleRow[] = [
  { reference: "BMO-26-1042", item: "Armoured copper cable", value: "₹3,04,000" },
  { reference: "BMO-26-1057", item: "LED high-bay light", value: "₹33,852" },
];

const COLUMNS: Column<ExampleRow>[] = [
  { key: "reference", header: "Order", render: (row) => row.reference },
  { key: "item", header: "Item", render: (row) => row.item },
  { key: "value", header: "Value", align: "right", render: (row) => row.value },
];

const PILLS: { tone: PillTone; label: string }[] = [
  { tone: "neutral", label: "Draft" },
  { tone: "info", label: "Bidding open" },
  { tone: "warn", label: "Auction live" },
  { tone: "ok", label: "Completed" },
  { tone: "bad", label: "Rejected" },
];

export default function ComponentsPage() {
  if (getServerEnv().APP_ENV === "production") notFound();
  const serverNowMs = readServerNow();

  return (
    <ToastProvider>
      <main className="page-wrap flex flex-col gap-6 py-8">
        <h1 className="text-3xl font-extrabold">Components</h1>
        <p className="text-muted">Internal preview with example data. Hidden in production.</p>

        <PreviewSection title="Buttons">
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="gold">Gold</Button>
            <Button size="small">Small</Button>
            <Button loading>Confirming</Button>
            <Button disabled>Disabled</Button>
            <ButtonLink href="/" variant="secondary">
              Link
            </ButtonLink>
          </div>
        </PreviewSection>

        <PreviewSection title="Status pills">
          <div className="flex flex-wrap gap-2">
            {PILLS.map((pill) => (
              <StatusPill key={pill.label} {...pill} />
            ))}
          </div>
        </PreviewSection>

        <PreviewSection title="Banners">
          <Banner>Your tender is awaiting review.</Banner>
          <Banner tone="warn">Verification takes up to 48 hours.</Banner>
          <Banner tone="bad">Your account is blocked until 4 Dec 2026.</Banner>
        </PreviewSection>

        <PreviewSection title="Forms">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              id="preview-name"
              label="Organisation name"
              hint="As shown on your PAN."
              defaultValue="Example Traders Pvt Ltd"
            />
            <TextField
              id="preview-pan"
              label="Business PAN"
              defaultValue="AAAA"
              error="PAN has 10 characters, such as AAAAA0000A."
            />
            <SelectField id="preview-type" label="Organisation type">
              <option>Company</option>
              <option>LLP</option>
            </SelectField>
            <TextField id="preview-off" label="GSTIN" disabled defaultValue="23AABCN1234F1Z5" />
            <TextareaField id="preview-note" label="Describe the problem" />
          </div>
        </PreviewSection>

        <PreviewSection title="Tables and facts">
          <DataTable
            caption="Example orders"
            columns={COLUMNS}
            rows={ROWS}
            rowKey={(row) => row.reference}
          />
          <DataTable
            caption="Empty orders"
            columns={COLUMNS}
            rows={[]}
            rowKey={(row) => row.reference}
            empty={
              <EmptyState
                message="Orders appear here after you buy."
                action={
                  <ButtonLink href="/products" variant="secondary">
                    Browse products
                  </ButtonLink>
                }
              />
            }
          />
          <SkeletonRows rows={3} />
          <FactList
            facts={[
              { label: "Quantity", value: "500 m", numeric: true },
              { label: "Consignee", value: "Plant Stores, Bhopal" },
              { label: "Order value", value: "₹3,04,000", numeric: true },
            ]}
          />
        </PreviewSection>

        <PreviewSection title="Order parts">
          <Stepper
            steps={[
              { label: "Placed", date: "1 Nov 2026", done: true },
              { label: "Accepted", date: "2 Nov 2026", done: true },
              { label: "Dispatched", done: false },
              { label: "Completed", done: false },
            ]}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <ActionPanel title="Next step">
              <MoneySummary valuePaise={4_500_000} feePaise={4_500} gstPaise={810} />
              <Button>Pay ₹53.10 and place order</Button>
            </ActionPanel>
            <ProductCard
              href="/products"
              title="Armoured copper cable, 16 sq mm"
              location="Jabalpur, Madhya Pradesh"
              netPaise={79_120}
              mrpPaise={92_000}
              discountPercent={14}
              unit="m"
            />
          </div>
          <p>
            Countdowns:{" "}
            <Countdown endsAtMs={serverNowMs + 3 * 3_600_000} serverNowMs={serverNowMs} /> ·{" "}
            <Countdown endsAtMs={serverNowMs + 300_000} serverNowMs={serverNowMs} /> ·{" "}
            <Countdown endsAtMs={serverNowMs + 45_000} serverNowMs={serverNowMs} /> ·{" "}
            <Countdown endsAtMs={serverNowMs - 1000} serverNowMs={serverNowMs} />
          </p>
        </PreviewSection>

        <PreviewSection title="Message thread">
          <MessageThread
            messages={[
              {
                id: "1",
                author: "Priya",
                role: "Buyer",
                body: "Six items arrived damaged.",
                sentAt: "2 Nov, 11:20 AM",
              },
              {
                id: "2",
                author: "Support",
                role: "Admin",
                body: "Please upload a photo of the damage.",
                sentAt: "2 Nov, 2:05 PM",
              },
            ]}
          />
        </PreviewSection>

        <PreviewSection title="Interactive parts">
          <InteractivePreview serverNowMs={serverNowMs} />
        </PreviewSection>
      </main>
    </ToastProvider>
  );
}
