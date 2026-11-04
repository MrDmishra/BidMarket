"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { apiWrite } from "@/lib/api/client";
import { SelectField, TextField } from "@/components/ui/field";
import Link from "next/link";

type ApiError = { error?: { message?: string; fields?: Record<string, string> } };

const ENTITY_TYPES = [
  ["individual", "Individual"],
  ["proprietorship", "Proprietorship"],
  ["partnership", "Partnership"],
  ["trust_society", "Trust or society"],
  ["llp", "LLP"],
  ["company", "Company"],
];

export function OrganisationForm() {
  const router = useRouter();
  const [kind, setKind] = useState("buyer");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    setFields({});
    try {
      const response = await apiWrite("/api/v1/onboarding/organisation", {
        json: {
          kind,
          entityType: form.get("entityType"),
          legalName: form.get("legalName"),
          acceptedTerms: form.get("acceptedTerms") === "on",
        },
      });
      if (response.ok) {
        router.push(`/${kind}`);
        router.refresh();
        return;
      }
      const body = (await response.json().catch(() => ({}))) as ApiError;
      setFields(body.error?.fields ?? {});
      setError(body.error?.message ?? "We could not save this. Try again.");
    } catch {
      setError("We could not reach Bid Market. Check your connection and try again.");
    }
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm font-semibold">I want to</legend>
        <div className="flex flex-wrap gap-4">
          {[
            ["buyer", "Buy"],
            ["seller", "Sell"],
          ].map(([value, label]) => (
            <label key={value} className="flex min-h-11 items-center gap-2">
              <input
                type="radio"
                name="kind"
                value={value}
                checked={kind === value}
                onChange={() => setKind(value as string)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <SelectField
        id="entityType"
        name="entityType"
        label="Organisation type"
        defaultValue="company"
        error={fields.entityType}
      >
        {ENTITY_TYPES.filter(([value]) => kind === "buyer" || value !== "individual").map(
          ([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ),
        )}
      </SelectField>
      <TextField
        id="legalName"
        name="legalName"
        label="Legal name"
        hint="As shown on your PAN."
        autoComplete="organization"
        error={fields.legalName}
      />
      <div>
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" name="acceptedTerms" />
          <span>
            I accept the <Link href="/terms">terms</Link> and{" "}
            <Link href="/privacy">privacy policy</Link>.
          </span>
        </label>
        {fields.acceptedTerms ? (
          <p className="text-sm font-medium text-bad">{fields.acceptedTerms}</p>
        ) : null}
      </div>
      <Button type="submit" loading={pending}>
        Continue
      </Button>
    </form>
  );
}
