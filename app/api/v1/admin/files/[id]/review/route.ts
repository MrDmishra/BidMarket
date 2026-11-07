import { handleJson } from "@/lib/api/route";
import { fileReviewSchema, reviewFile } from "@/modules/admin";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  return handleJson(request, fileReviewSchema, (input) =>
    reviewFile(id, input.clean, input.reason),
  );
}
