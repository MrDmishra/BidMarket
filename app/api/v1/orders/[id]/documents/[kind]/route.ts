import { createRequestId, jsonError } from "@/lib/api/response";
import { getOrderPdf } from "@/modules/documents";

type Context = { params: Promise<{ id: string; kind: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const { id, kind } = await params;
    const { body, fileName } = await getOrderPdf(id, kind);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    return jsonError(error, createRequestId());
  }
}
