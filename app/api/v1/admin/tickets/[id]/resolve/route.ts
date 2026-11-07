import { handleJson } from "@/lib/api/route";
import { resolveSchema, resolveTicket } from "@/modules/admin";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  return handleJson(request, resolveSchema, (input) =>
    resolveTicket(id, input.resolution, input.reason),
  );
}
