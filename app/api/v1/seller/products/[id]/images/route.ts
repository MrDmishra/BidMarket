import { handleWrite } from "@/lib/api/route";
import { AppError } from "@/lib/errors/app-error";
import { addProductImage } from "@/modules/catalogue";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) {
    return handleWrite(request, "missing", async () => {
      throw new AppError("VALIDATION_FAILED", { fields: { image: "Choose an image." } });
    });
  }
  return handleWrite(request, `${file.name}:${file.size}`, () => addProductImage(id, file), 201);
}
