import { handleWrite } from "@/lib/api/route";
import { createCheckout } from "@/modules/billing";

type Context = { params: Promise<{ chargeId: string }> };

export async function POST(request: Request, { params }: Context) {
  const { chargeId } = await params;
  return handleWrite(request, chargeId, () => createCheckout(chargeId));
}
