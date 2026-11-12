"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { SelectField, TextareaField, TextField } from "@/components/ui/field";
import { apiWrite } from "@/lib/api/client";
import { fillPath } from "@/lib/fill-path";

export type ActionField =
  | { kind: "text"; name: string; label: string; hint?: string; inputMode?: "numeric" }
  | { kind: "textarea"; name: string; label: string; hint?: string }
  | { kind: "select"; name: string; label: string; options: { value: string; label: string }[] }
  | { kind: "checkbox"; name: string; label: string };

type ActionFormProps = {
  id: string;
  endpoint: string;
  buttonLabel: string;
  fields?: ActionField[];
  /** Fixed values sent with the form, such as the reference an incident is about. */
  body?: Record<string, unknown>;
  /** Turns named text fields into numbers, or null when left empty. */
  numberFields?: string[];
  variant?: "primary" | "secondary" | "danger";
  note?: string;
  /**
   * Opens this path after a successful create. ":name" is replaced with that field of the reply,
   * for example "/support/tickets/:ticketId". It is a string because server pages cannot pass
   * functions to this client component.
   */
  redirectTo?: string;
};

/** One form for every server action that sends a few fields and then refreshes the page. */
export function ActionForm({
  id,
  endpoint,
  buttonLabel,
  fields = [],
  body = {},
  numberFields = [],
  variant,
  note,
  redirectTo,
}: ActionFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const json: Record<string, unknown> = { ...body };
    for (const field of fields) {
      if (field.kind === "checkbox") {
        json[field.name] = data.get(field.name) === "on";
        continue;
      }
      const value = String(data.get(field.name) ?? "").trim();
      json[field.name] = numberFields.includes(field.name)
        ? value === ""
          ? null
          : Number(value)
        : value;
    }
    setPending(true);
    setErrors({});
    setMessage("");
    const response = await apiWrite(endpoint, { json }).catch(() => null);
    const result = (await response?.json().catch(() => null)) as {
      data?: unknown;
      error?: { message?: string; fields?: Record<string, string> };
    } | null;
    setPending(false);
    if (response?.ok) {
      form.reset();
      const next = redirectTo ? fillPath(redirectTo, result?.data) : null;
      if (next) router.push(next);
      else router.refresh();
      return;
    }
    setErrors(result?.error?.fields ?? {});
    setMessage(result?.error?.message ?? "We could not do that. Try again.");
  }

  return (
    <form
      className="flex flex-col items-stretch gap-3"
      onSubmit={(event) => void submit(event)}
      noValidate
    >
      {message ? <Banner tone="bad">{message}</Banner> : null}
      {fields.map((field) => {
        const fieldId = `${id}-${field.name}`;
        if (field.kind === "textarea") {
          return (
            <TextareaField
              key={field.name}
              id={fieldId}
              name={field.name}
              label={field.label}
              hint={field.hint}
              error={errors[field.name]}
            />
          );
        }
        if (field.kind === "select") {
          return (
            <SelectField
              key={field.name}
              id={fieldId}
              name={field.name}
              label={field.label}
              error={errors[field.name]}
            >
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          );
        }
        if (field.kind === "checkbox") {
          return (
            <label key={field.name} htmlFor={fieldId} className="flex items-center gap-2">
              <input id={fieldId} name={field.name} type="checkbox" className="size-5" />
              {field.label}
            </label>
          );
        }
        return (
          <TextField
            key={field.name}
            id={fieldId}
            name={field.name}
            label={field.label}
            hint={field.hint}
            inputMode={field.inputMode}
            error={errors[field.name]}
          />
        );
      })}
      <div>
        <Button type="submit" variant={variant} disabled={pending}>
          {pending ? "Working…" : buttonLabel}
        </Button>
      </div>
      {note ? <p className="text-sm text-muted">{note}</p> : null}
    </form>
  );
}
