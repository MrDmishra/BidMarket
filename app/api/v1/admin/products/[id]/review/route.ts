import { handleJson } from "@/lib/api/route";
import { productReviewSchema, reviewProduct } from "@/modules/catalogue";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  return handleJson(request, productReviewSchema, ({ decision, note }) =>
    reviewProduct(id, decision, note),
  );
}
