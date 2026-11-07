import { handleJson } from "@/lib/api/route";
import { auctionBidSchema, placeAuctionBid } from "@/modules/tenders";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  return handleJson(
    request,
    auctionBidSchema,
    (input) => placeAuctionBid(id, input.unitPaise, input.bidKey),
    201,
  );
}
