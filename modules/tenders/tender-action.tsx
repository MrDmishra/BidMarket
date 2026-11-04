"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { apiWrite } from "@/lib/api/client";

type TenderActionProps = {
  endpoint: string;
  method?: string;
  buttonLabel: string;
  variant?: "primary" | "secondary" | "danger";
  body?: unknown;
  field?: { id: string; label: string; name: string; hint?: string; inputMode?: "decimal" };
  note?: string;
};

/** One button, with an optional text field, for every tender step that only needs a server call. */
export function TenderAction({
  endpoint,
  method,
  buttonLabel,
  variant,
  body = {},
  field,
  note,
}: TenderActionProps) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError("");
    const json = field ? { [field.name]: value } : body;
    const response = await apiWrite(endpoint, { method, json }).catch(() => null);
    const result = (await response?.json().catch(() => null)) as {
      error?: { message?: string; fields?: Record<string, string> };
    } | null;
    setPending(false);
    if (response?.ok) {
      setValue("");
      router.refresh();
      return;
    }
    const fieldError = field ? result?.error?.fields?.[field.name] : undefined;
    setError(fieldError ?? result?.error?.message ?? "We could not do that. Try again.");
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {error ? <Banner tone="bad">{error}</Banner> : null}
      {field ? (
        <TextField
          id={field.id}
          label={field.label}
          hint={field.hint}
          inputMode={field.inputMode}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      ) : null}
      <Button type="button" variant={variant} disabled={pending} onClick={() => void submit()}>
        {buttonLabel}
      </Button>
      {note ? <p className="text-sm text-muted">{note}</p> : null}
    </div>
  );
}
