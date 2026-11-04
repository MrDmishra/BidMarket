import { createRequestId, jsonError } from "@/lib/api/response";
import { getInvoicePdf } from "@/modules/documents";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const { body, fileName } = await getInvoicePdf(id);
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
