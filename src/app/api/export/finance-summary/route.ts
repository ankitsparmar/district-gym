import { db, schema } from "@/db";
import { requireStaff } from "@/lib/rbac";
import { and, eq, gte, sql, sum } from "drizzle-orm";
import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { formatMoney } from "@/lib/business";

function streamToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

export async function GET() {
  try {
    await requireStaff(["ADMIN", "MANAGER"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [monthRevenue, yearRevenue, methodBreakdown, expensesMonth, expensesByCategory] = await Promise.all([
    db.select({ total: sum(schema.payments.amount) }).from(schema.payments).where(and(gte(schema.payments.paidAt, monthStart), eq(schema.payments.status, "COMPLETED"))),
    db.select({ total: sum(schema.payments.amount) }).from(schema.payments).where(and(gte(schema.payments.paidAt, yearStart), eq(schema.payments.status, "COMPLETED"))),
    db.select({ method: schema.payments.method, total: sum(schema.payments.amount) }).from(schema.payments).where(eq(schema.payments.status, "COMPLETED")).groupBy(schema.payments.method),
    db.select({ total: sum(schema.expenses.amount) }).from(schema.expenses).where(gte(schema.expenses.date, monthStart.toISOString().slice(0, 10))),
    db.select({ category: schema.expenses.category, total: sum(schema.expenses.amount) }).from(schema.expenses).groupBy(schema.expenses.category),
  ]);

  const doc = new PDFDocument({ margin: 50 });
  const bufferPromise = streamToBuffer(doc);

  doc.fontSize(20).fillColor("#14151a").text("District Gym — Financial Summary", { align: "left" });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#3f4453").text(`Generated ${now.toDateString()}`);
  doc.moveDown(1.5);

  doc.fontSize(14).fillColor("#14151a").text("Revenue");
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor("#14151a");
  doc.text(`This month: ${formatMoney(monthRevenue[0]?.total ?? 0)}`);
  doc.text(`Year to date: ${formatMoney(yearRevenue[0]?.total ?? 0)}`);
  doc.moveDown(1);

  doc.fontSize(14).fillColor("#14151a").text("Payment method breakdown");
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor("#14151a");
  for (const m of methodBreakdown) {
    doc.text(`${m.method.replace("_", " ")}: ${formatMoney(m.total ?? 0)}`);
  }
  doc.moveDown(1);

  doc.fontSize(14).fillColor("#14151a").text("Expenses (this month)");
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor("#14151a").text(`Total: ${formatMoney(expensesMonth[0]?.total ?? 0)}`);
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor("#3f4453").text("By category (all time):");
  for (const e of expensesByCategory) {
    doc.text(`  ${e.category.replace("_", " ")}: ${formatMoney(e.total ?? 0)}`);
  }
  doc.moveDown(1);

  const net = Number(monthRevenue[0]?.total ?? 0) - Number(expensesMonth[0]?.total ?? 0);
  doc.fontSize(14).fillColor("#14151a").text("Net (this month)");
  doc.fontSize(12).fillColor(net >= 0 ? "#059669" : "#dc2626").text(formatMoney(net));

  doc.end();
  const buffer = await bufferPromise;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="district-gym-finance-summary-${now.toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
