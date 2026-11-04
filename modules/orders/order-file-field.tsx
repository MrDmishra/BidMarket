"use client";

import { useState } from "react";
import { FileUpload } from "@/components/ui/file-upload";
import { apiWrite } from "@/lib/api/client";

const MAX_BYTES = 4 * 1024 * 1024;

type OrderFileFieldProps = {
  id: string;
  label: string;
  accept: string;
  acceptLabel: string;
  onUploaded: (fileId: string | null) => void;
};

/** Uploads as soon as a file is picked, so a form submit only sends the file's ID. */
export function OrderFileField({
  id,
  label,
  accept,
  acceptLabel,
  onUploaded,
}: OrderFileFieldProps) {
  const [error, setError] = useState("");

  async function upload(file: File | null) {
    onUploaded(null);
    setError("");
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    const response = await apiWrite("/api/v1/orders/files", { form }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as {
      data?: { fileId?: string };
      error?: { fields?: { file?: string; image?: string } };
    } | null;
    if (response?.ok && body?.data?.fileId) onUploaded(body.data.fileId);
    else
      setError(
        body?.error?.fields?.file ?? body?.error?.fields?.image ?? "Upload failed. Try again.",
      );
  }

  return (
    <FileUpload
      id={id}
      label={label}
      accept={accept}
      acceptLabel={acceptLabel}
      maxBytes={MAX_BYTES}
      error={error}
      onSelect={(file) => void upload(file)}
    />
  );
}
