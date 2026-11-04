import "server-only";

import sharp from "sharp";
import { AppError } from "@/lib/errors/app-error";

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);
const MAX_EDGE = 1600;

/** Re-encoding keeps only pixels, which removes hidden payloads and location metadata. */
export async function normaliseImage(input: Buffer): Promise<Buffer> {
  const invalid = () =>
    new AppError("VALIDATION_FAILED", {
      fields: { image: "Use a JPEG, PNG or WebP image under 4 MB." },
    });
  if (input.length === 0 || input.length > MAX_IMAGE_BYTES) throw invalid();

  try {
    const image = sharp(input, { limitInputPixels: 40_000_000 });
    const { format } = await image.metadata();
    if (!format || !ALLOWED_FORMATS.has(format)) throw invalid();
    return await image
      .rotate()
      .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw invalid();
  }
}
