import { handleWrite } from "@/lib/api/route";
import { AppError } from "@/lib/errors/app-error";
import { runProductAction } from "@/modules/catalogue";

type Context = { params: Promise<{ id: string; action: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id, action } = await params;
  return handleWrite(request, action, async () => {
    if (action !== "submit" && action !== "publish" && action !== "unpublish") {
      throw new AppError("NOT_FOUND");
    }
    await runProductAction(id, action);
  });
}
