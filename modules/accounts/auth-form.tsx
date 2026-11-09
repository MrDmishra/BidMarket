"use client";

import { useActionState } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import type { AuthFormState } from "@/modules/accounts/auth-actions";

export type AuthField = {
  name: string;
  label: string;
  type: "email" | "password" | "text";
  autoComplete: string;
  inputMode?: "numeric";
  hint?: string;
};

type AuthFormProps = {
  action: (state: AuthFormState, form: FormData) => Promise<AuthFormState>;
  fields: AuthField[];
  submitLabel: string;
};

export function AuthForm({ action, fields, submitLabel }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.error ? <Banner tone="bad">{state.error}</Banner> : null}
      {state.message ? <Banner>{state.message}</Banner> : null}
      {fields.map((field) => (
        <TextField
          key={field.name}
          id={field.name}
          name={field.name}
          label={field.label}
          type={field.type}
          autoComplete={field.autoComplete}
          inputMode={field.inputMode}
          hint={field.hint}
          error={state.fields?.[field.name]}
        />
      ))}
      <Button type="submit" loading={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
