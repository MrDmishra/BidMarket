import { handleJson } from "@/lib/api/route";
import { setUserAccess, userAccessSchema } from "@/modules/admin";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  return handleJson(request, userAccessSchema, (input) =>
    setUserAccess(id, input.disable, input.reason),
  );
}
