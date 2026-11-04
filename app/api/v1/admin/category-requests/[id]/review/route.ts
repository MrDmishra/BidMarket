import { handleJson } from "@/lib/api/route";
import { categoryRequestReviewSchema, reviewCategoryRequest } from "@/modules/catalogue";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  return handleJson(request, categoryRequestReviewSchema, ({ approve, note }) =>
    reviewCategoryRequest(id, approve, note),
  );
}
