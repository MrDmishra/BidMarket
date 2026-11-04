import "server-only";

import { createHash } from "node:crypto";
import { AppError } from "@/lib/errors/app-error";
import { MAX_IMAGE_BYTES, normaliseImage } from "@/lib/files/image";

const PDF_SIGNATURE = "%PDF-";

export type StoredDocument = { body: Buffer; mimeType: string; extension: string; sha256: string };

const digest = (body: Buffer) => createHash("sha256").update(body).digest("hex");

/** Decides the type from the file's bytes, never from its name or stated type. */
export async function prepareDocument(input: Buffer, allowPdf: boolean): Promise<StoredDocument> {
  if (allowPdf && input.subarray(0, PDF_SIGNATURE.length).toString("latin1") === PDF_SIGNATURE) {
    if (input.length > MAX_IMAGE_BYTES) {
      throw new AppError("VALIDATION_FAILED", { fields: { file: "Use a PDF under 4 MB." } });
    }
    return { body: input, mimeType: "application/pdf", extension: "pdf", sha256: digest(input) };
  }
  const body = await normaliseImage(input);
  return { body, mimeType: "image/webp", extension: "webp", sha256: digest(body) };
}
