import { handleWrite } from "@/lib/api/route";
import { removeProductImage } from "@/modules/catalogue";

type Context = { params: Promise<{ mediaId: string }> };

export async function DELETE(request: Request, { params }: Context) {
  const { mediaId } = await params;
  return handleWrite(request, "remove", () => removeProductImage(mediaId));
}
