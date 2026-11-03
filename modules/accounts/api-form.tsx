"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";

export type ApiFormField = {
  name: string;
  label: string;
  hint?: string;
  optional?: boolean;
  options?: { value: string; label: string }[];
};

type ApiError = { error?: { message?: string; fields?: Record<string, string> } };

type ApiFormProps = { id: string; endpoint: string; fields: ApiFormField[]; submitLabel: string };

/** Sends the form as JSON, shows server errors by field, then reloads server data. */
export function ApiForm({ id, endpoint, fields, submitLabel }: ApiFormProps) {
  const router = useRouter();
  const [fieldMessages, setFieldMessages] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)));
    setPending(true);
    setError("");
    setFieldMessages({});
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (response.ok) {
        router.refresh();
      } else {
        const result = (await response.json().catch(() => ({}))) as ApiError;
        setFieldMessages(result.error?.fields ?? {});
        setError(result.error?.message ?? "We could not save this. Try again.");
      }
    } catch {
      setError("We could not reach Bid Market. Check your connection and try again.");
    }
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
      {error ? <Banner tone="bad">{error}</Banner> : null}
      {fields.map((field) =>
        field.options ? (
          <SelectField
            key={field.name}
            id={`${id}-${field.name}`}
            name={field.name}
            label={field.label}
            error={fieldMessages[field.name]}
            defaultValue=""
          >
            <option value="" disabled>
              Choose
            </option>
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
        ) : (
          <TextField
            key={field.name}
            id={`${id}-${field.name}`}
            name={field.name}
            label={field.optional ? `${field.label} (optional)` : field.label}
            hint={field.hint}
            error={fieldMessages[field.name]}
          />
        ),
      )}
      <Button type="submit" loading={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
