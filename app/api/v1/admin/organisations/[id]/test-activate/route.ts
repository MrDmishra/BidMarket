import { handleJson } from "@/lib/api/route";
import { testActivateSeller } from "@/modules/accounts";
import { testActivationSchema } from "@/modules/catalogue";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  return handleJson(request, testActivationSchema, ({ reason }) => testActivateSeller(id, reason));
}
