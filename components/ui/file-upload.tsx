"use client";

import { useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";

type FileUploadProps = {
  id: string;
  label: string;
  accept: string;
  maxBytes: number;
  acceptLabel: string;
  progressPercent?: number;
  error?: string;
  onSelect?: (file: File | null) => void;
};

const BYTES_PER_MB = 1024 * 1024;

export function FileUpload({
  id,
  label,
  accept,
  maxBytes,
  acceptLabel,
  progressPercent,
  error,
  onSelect,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [sizeError, setSizeError] = useState("");
  const maxMb = maxBytes / BYTES_PER_MB;
  const shownError = sizeError || error;

  function select(next: File | null) {
    setFile(next);
    onSelect?.(next);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (chosen && chosen.size > maxBytes) {
      setSizeError(`This file is too large. Choose one under ${maxMb} MB.`);
      select(null);
      return;
    }
    setSizeError("");
    select(chosen);
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        type="file"
        accept={accept}
        onChange={handleChange}
        aria-describedby={`${id}-hint`}
        aria-invalid={shownError ? true : undefined}
        className="w-full rounded-control border border-line bg-surface p-2 text-sm"
      />
      <p id={`${id}-hint`} className="text-sm text-muted">
        {acceptLabel}, up to {maxMb} MB.
      </p>
      {file ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="min-w-0 wrap-anywhere">{file.name}</span>
          <Button size="small" variant="secondary" onClick={() => select(null)}>
            Remove
          </Button>
        </div>
      ) : null}
      {progressPercent !== undefined ? (
        <progress
          value={progressPercent}
          max={100}
          aria-label="Upload progress"
          className="h-2 w-full accent-accent"
        />
      ) : null}
      {shownError ? <p className="text-sm font-medium text-bad">{shownError}</p> : null}
    </div>
  );
}
