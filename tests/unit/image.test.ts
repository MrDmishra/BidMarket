import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { normaliseImage } = await import("@/lib/files/image");

const png = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: "#0b6b4e" } })
    .png()
    .toBuffer();

describe("normaliseImage", () => {
  it("converts images to WebP", async () => {
    const result = await normaliseImage(await png(40, 30));
    const metadata = await sharp(result).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(40);
  });

  it("shrinks large images", async () => {
    const result = await normaliseImage(await png(3000, 1500));
    expect((await sharp(result).metadata()).width).toBe(1600);
  });

  it("removes embedded metadata", async () => {
    const tagged = await sharp(await png(20, 20))
      .withExif({ IFD0: { Copyright: "secret-location" } })
      .jpeg()
      .toBuffer();
    const result = await normaliseImage(tagged);
    expect((await sharp(result).metadata()).exif).toBeUndefined();
  });

  it.each([
    ["a script", Buffer.from("<script>alert(1)</script>")],
    ["an empty file", Buffer.alloc(0)],
    ["an oversized file", Buffer.alloc(4 * 1024 * 1024 + 1)],
  ])("refuses %s", async (_name, input) => {
    await expect(normaliseImage(input)).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("refuses an SVG", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
    await expect(normaliseImage(svg)).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });
});
