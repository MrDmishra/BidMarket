import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { StatusPill } from "@/components/ui/status-pill";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Wordmark } from "@/components/ui/wordmark";
import { getAccount } from "@/lib/auth/account";
import { INDIAN_STATES } from "@/lib/india/states";
import { recentFinancialYears } from "@/lib/time/financial-year";
import { getVerificationProgress } from "@/modules/accounts";
import { ApiForm } from "@/modules/accounts/api-form";
import { SubmitVerificationButton } from "@/modules/accounts/submit-button";

export const metadata: Metadata = { title: "Complete verification" };
export const dynamic = "force-dynamic";

const STATES = INDIAN_STATES.map(([value, label]) => ({ value, label }));

function Step({
  title,
  done,
  summary,
  children,
}: {
  title: string;
  done: boolean;
  summary?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">{title}</h2>
        <StatusPill tone={done ? "ok" : "neutral"} label={done ? "Saved" : "To do"} />
      </div>
      {done ? <p className="font-mono text-sm text-muted">{summary}</p> : children}
    </section>
  );
}

export default async function VerifyPage() {
  const account = await getAccount();
  if (!account) redirect("/login");
  if (!account.organisation) redirect("/onboarding");
  if (account.organisation.status !== "draft") redirect(`/${account.organisation.kind}`);

  const { id, kind } = account.organisation;
  const progress = await getVerificationProgress(id);
  const isSeller = kind === "seller";
  const [year1, year2, year3] = recentFinancialYears();
  const ready =
    Boolean(progress.panLast4 && progress.address && progress.bank) &&
    (!isSeller || progress.turnoverYears >= 3);

  return (
    <main className="page-wrap flex flex-col items-center gap-5 py-10">
      <div className="flex items-center gap-3">
        <Wordmark />
        <ThemeToggle />
      </div>
      <div className="flex w-full max-w-xl flex-col gap-4">
        <h1 className="text-3xl font-bold">Complete verification</h1>
        <p className="text-muted">
          An admin checks these details. Addresses and bank accounts cannot be edited after saving.
        </p>
        <Step
          title="Business identity"
          done={Boolean(progress.panLast4)}
          summary={`PAN ending ${progress.panLast4}`}
        >
          <ApiForm
            id="identity"
            endpoint="/api/v1/onboarding/pan"
            submitLabel="Save identity"
            fields={[
              { name: "pan", label: "Business PAN", hint: "Such as AAAAA0000A." },
              {
                name: "gstin",
                label: "GSTIN",
                optional: !isSeller,
                hint: "Such as 22AAAAA0000A1Z5.",
              },
            ]}
          />
        </Step>
        <Step
          title="Registered address"
          done={Boolean(progress.address)}
          summary={`${progress.address?.city} ${progress.address?.pincode}`}
        >
          <ApiForm
            id="address"
            endpoint="/api/v1/organisation/addresses"
            submitLabel="Save address"
            fields={[
              { name: "line1", label: "Address line 1" },
              { name: "line2", label: "Address line 2", optional: true },
              { name: "city", label: "City" },
              { name: "stateCode", label: "State", options: STATES },
              { name: "pincode", label: "PIN code" },
            ]}
          />
        </Step>
        <Step
          title="Bank account"
          done={Boolean(progress.bank)}
          summary={`Account ending ${progress.bank?.account_last4}, ${progress.bank?.ifsc}`}
        >
          <ApiForm
            id="bank"
            endpoint="/api/v1/organisation/bank-accounts"
            submitLabel="Save bank account"
            fields={[
              { name: "holderName", label: "Account holder" },
              { name: "accountNumber", label: "Account number" },
              { name: "ifsc", label: "IFSC" },
            ]}
          />
        </Step>
        {isSeller ? (
          <Step title="Turnover" done={progress.turnoverYears >= 3} summary="Three years saved">
            <ApiForm
              id="turnover"
              endpoint="/api/v1/organisation/turnover"
              submitLabel="Save turnover"
              fields={[
                { name: "year1", label: `Turnover FY ${year1} (₹)` },
                { name: "year2", label: `Turnover FY ${year2} (₹)` },
                { name: "year3", label: `Turnover FY ${year3} (₹)` },
              ]}
            />
          </Step>
        ) : null}
        <SubmitVerificationButton ready={ready} />
      </div>
    </main>
  );
}
