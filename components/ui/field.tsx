import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const CONTROL =
  "w-full rounded-control border bg-surface px-3 py-2 text-ink placeholder:text-muted disabled:opacity-60 aria-invalid:border-bad";

type FieldProps = { id: string; label: string; hint?: string; error?: string };

function describedBy({ id, hint, error }: FieldProps) {
  return (
    [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined
  );
}

function FieldShell({ id, label, hint, error, children }: FieldProps & { children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  id,
  label,
  hint,
  error,
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        className={`${CONTROL} min-h-11 border-line`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy({ id, label, hint, error })}
        {...props}
      />
    </FieldShell>
  );
}

export function SelectField({
  id,
  label,
  hint,
  error,
  children,
  ...props
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        className={`${CONTROL} min-h-11 border-line`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy({ id, label, hint, error })}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export function TextareaField({
  id,
  label,
  hint,
  error,
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        className={`${CONTROL} min-h-24 resize-y border-line`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy({ id, label, hint, error })}
        {...props}
      />
    </FieldShell>
  );
}
