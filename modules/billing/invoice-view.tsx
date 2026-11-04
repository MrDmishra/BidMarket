import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { Banner } from "@/components/ui/banner";
import { ButtonLink } from "@/components/ui/button";
import { FactList } from "@/components/ui/fact-list";
import { formatInr } from "@/lib/money";
import { getInvoice } from "@/modules/billing/service";

type InvoiceViewProps = { id: string; organisationName: string };

export async function InvoiceView({ id, organisationName }: InvoiceViewProps) {
  const invoice = await getInvoice(id);
  if (!invoice) notFound();
  const { snapshot } = invoice;
  const taxRows = [
    { label: "Platform fee", paise: snapshot.feePaise },
    { label: "CGST", paise: snapshot.cgstPaise },
    { label: "SGST", paise: snapshot.sgstPaise },
    { label: "IGST", paise: snapshot.igstPaise },
    { label: "TDS deducted", paise: -snapshot.tdsPaise },
  ].filter((row) => row.paise !== 0);

  return (
    <>
      <AppHeader name={organisationName} />
      <main className="page-wrap flex max-w-3xl flex-col gap-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">Tax invoice</h1>
          <ButtonLink href={`/api/v1/invoices/${invoice.id}/pdf`} variant="secondary">
            Download PDF
          </ButtonLink>
        </div>
        {snapshot.supplierGstin ? null : (
          <Banner tone="warn">
            Test record. Not a valid tax invoice until GST details are set.
          </Banner>
        )}
        <FactList
          facts={[
            { label: "Invoice number", value: invoice.invoice_no, numeric: true },
            {
              label: "Date",
              value: new Intl.DateTimeFormat("en-IN", {
                dateStyle: "medium",
                timeZone: "Asia/Kolkata",
              }).format(new Date(invoice.issued_at)),
            },
            { label: "Financial year", value: invoice.financial_year },
          ]}
        />
        <FactList
          facts={[
            { label: "Supplier", value: snapshot.supplierName },
            { label: "Supplier GSTIN", value: snapshot.supplierGstin ?? "Not set" },
            { label: "Customer", value: snapshot.customerName },
            { label: "Customer GSTIN", value: snapshot.customerGstin ?? "Not provided" },
            { label: "Customer address", value: snapshot.customerAddress },
            { label: "Place of supply", value: `State code ${snapshot.customerStateCode}` },
          ]}
        />
        <dl className="flex flex-col gap-1 rounded-panel border border-line bg-surface p-5">
          {taxRows.map((row) => (
            <div key={row.label} className="flex justify-between gap-3">
              <dt>{row.label}</dt>
              <dd className="font-mono tabular-nums">{formatInr(row.paise)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-t border-line pt-2 font-bold">
            <dt>Total</dt>
            <dd className="font-mono tabular-nums">{formatInr(snapshot.totalPaise)}</dd>
          </div>
        </dl>
      </main>
    </>
  );
}
