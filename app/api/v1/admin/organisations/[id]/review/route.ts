import { handleJson } from "@/lib/api/route";
import { reviewOrganisation, reviewSchema } from "@/modules/accounts";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  return handleJson(request, reviewSchema, ({ approve, reason }) =>
    reviewOrganisation(id, approve, reason),
  );
}
