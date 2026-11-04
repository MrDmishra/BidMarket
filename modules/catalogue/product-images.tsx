"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { apiWrite } from "@/lib/api/client";
import { productImageUrl } from "@/lib/files/public-url";

const REQUIRED_IMAGES = 3;
const MAX_BYTES = 4 * 1024 * 1024;

type ProductImagesProps = { productId: string; images: { id: string; path: string }[] };

export function ProductImages({ productId, images }: ProductImagesProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError("This file is too large. Choose one under 4 MB.");
      return;
    }
    const form = new FormData();
    form.set("image", file);
    setPending(true);
    setError("");
    const response = await apiWrite(`/api/v1/seller/products/${productId}/images`, { form }).catch(
      () => null,
    );
    setPending(false);
    if (response?.ok) router.refresh();
    else setError("We could not use that file. Upload a JPEG, PNG or WebP image under 4 MB.");
  }

  async function remove(mediaId: string) {
    setPending(true);
    setError("");
    const response = await apiWrite(`/api/v1/seller/products/${productId}/images/${mediaId}`, {
      method: "DELETE",
    }).catch(() => null);
    setPending(false);
    if (response?.ok) router.refresh();
    else setError("We could not remove that image. Try again.");
  }

  return (
    <section
      aria-label="Product images"
      className="flex max-w-3xl flex-col gap-3 rounded-panel border border-line bg-surface p-5"
    >
      <h2 className="text-xl font-bold">
        Images ({images.length} of {REQUIRED_IMAGES})
      </h2>
      <p className="text-sm text-muted">
        Add 3 images, with no logos, watermarks or contact details.
      </p>
      {error ? <Banner tone="bad">{error}</Banner> : null}
      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {images.map((image, index) => (
            <div key={image.id} className="flex flex-col gap-1">
              <div
                role="img"
                aria-label={`Image ${index + 1}`}
                className="aspect-square rounded-control bg-sunk bg-cover bg-center"
                style={{ backgroundImage: `url(${productImageUrl(image.path)})` }}
              />
              <Button
                size="small"
                variant="secondary"
                disabled={pending}
                onClick={() => remove(image.id)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      {images.length < REQUIRED_IMAGES ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="product-image" className="text-sm font-semibold">
            Add an image
          </label>
          <input
            id="product-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={pending}
            onChange={upload}
            className="w-full rounded-control border border-line bg-surface p-2 text-sm"
          />
        </div>
      ) : null}
    </section>
  );
}
