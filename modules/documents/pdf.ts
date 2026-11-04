import PDFDocument from "pdfkit";
import { formatInr } from "@/lib/money";

export type PdfSection = { heading: string; rows: [label: string, value: string][] };
export type PdfContent = {
  title: string;
  subtitle: string;
  sections: PdfSection[];
  notes?: string[];
};

const MARGIN = 56;
const LABEL_WIDTH = 170;

/** Built-in PDF fonts lack the rupee sign, so amounts print as "INR". */
export function formatPdfAmount(paise: number) {
  return formatInr(paise).replace("₹", "INR ");
}

export function renderPdf(content: PdfContent): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: "A4",
      margin: MARGIN,
      info: { Title: content.title },
    });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    document.font("Helvetica-Bold").fontSize(20).text(content.title);
    document.font("Helvetica").fontSize(10).fillColor("#555555").text(content.subtitle);
    document.fillColor("#000000").moveDown();

    for (const section of content.sections) {
      document.font("Helvetica-Bold").fontSize(12).text(section.heading).moveDown(0.3);
      for (const [label, value] of section.rows) {
        const top = document.y;
        document.font("Helvetica").fontSize(10).fillColor("#555555");
        document.text(label, MARGIN, top, { width: LABEL_WIDTH });
        const labelBottom = document.y;
        document.fillColor("#000000").text(value, MARGIN + LABEL_WIDTH, top, {
          width: document.page.width - MARGIN * 2 - LABEL_WIDTH,
        });
        document.y = Math.max(document.y, labelBottom);
        document.x = MARGIN;
      }
      document.moveDown();
    }
    for (const note of content.notes ?? []) {
      document.font("Helvetica").fontSize(9).fillColor("#555555").text(note).moveDown(0.3);
    }
    document.end();
  });
}
