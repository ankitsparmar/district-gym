import { db, schema } from "@/db";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { formatMoney, formatDate } from "@/lib/business";

function streamToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  const sessionMemberId = (session?.user as any)?.memberId as number | undefined;
  if (!session?.user || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const [invoice] = await db.select().from(schema.invoices).where(eq(schema.invoices.id, Number(id))).limit(1);
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = role === "MEMBER" && sessionMemberId === invoice.memberId;
  const isStaff = role !== "MEMBER";
  if (!isOwner && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const [member] = await db.select().from(schema.members).where(eq(schema.members.id, invoice.memberId)).limit(1);

  const doc = new PDFDocument({ margin: 50 });
  const bufferPromise = streamToBuffer(doc);

  doc.fontSize(20).fillColor("#14151a").text("DISTRICT GYM", { continued: false });
  doc.fontSize(10).fillColor("#3f4453").text("123 Fitness Ave, London");
  doc.moveDown(1.5);

  doc.fontSize(16).fillColor("#14151a").text(`Invoice ${invoice.invoiceNumber}`);
  doc.fontSize(10).fillColor("#3f4453").text(`Issued: ${formatDate(invoice.issueDate)}`);
  doc.text(`Status: ${invoice.status}`);
  doc.moveDown(1);

  doc.fontSize(11).fillColor("#14151a").text(`Bill to: ${member ? `${member.firstName} ${member.lastName}` : "—"}`);
  if (member?.email) doc.fontSize(10).fillColor("#3f4453").text(member.email);
  doc.moveDown(1.5);

  doc.fontSize(11).fillColor("#14151a").text("Line items", { underline: true });
  doc.moveDown(0.5);
  const items = Array.isArray(invoice.lineItems) ? (invoice.lineItems as any[]) : [];
  for (const item of items) {
    doc.fontSize(10).fillColor("#14151a").text(`${item.description}`, { continued: true });
    doc.text(`  ${formatMoney(item.amount)}`, { align: "right" });
  }
  doc.moveDown(1);

  doc.fontSize(10).fillColor("#3f4453").text(`Subtotal: ${formatMoney(invoice.subtotal)}`, { align: "right" });
  doc.text(`Tax (${invoice.taxRate}%): ${formatMoney(invoice.taxAmount)}`, { align: "right" });
  doc.fontSize(13).fillColor("#14151a").text(`Total: ${formatMoney(invoice.total)}`, { align: "right" });

  doc.moveDown(2);
  doc.fontSize(9).fillColor("#3f4453").text("Thank you for training with District Gym.", { align: "center" });

  doc.end();
  const buffer = await bufferPromise;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
    },
  });
}
