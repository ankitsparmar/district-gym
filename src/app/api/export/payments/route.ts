import { db, schema } from "@/db";
import { requireStaff } from "@/lib/rbac";
import { desc, eq } from "drizzle-orm";
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await requireStaff(["ADMIN", "MANAGER"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: schema.payments.id,
      paidAt: schema.payments.paidAt,
      amount: schema.payments.amount,
      method: schema.payments.method,
      status: schema.payments.status,
      reference: schema.payments.reference,
      notes: schema.payments.notes,
      firstName: schema.members.firstName,
      lastName: schema.members.lastName,
      memberCode: schema.members.memberCode,
    })
    .from(schema.payments)
    .innerJoin(schema.members, eq(schema.members.id, schema.payments.memberId))
    .orderBy(desc(schema.payments.paidAt));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "District Gym";
  const sheet = workbook.addWorksheet("Payments");

  sheet.columns = [
    { header: "Date", key: "date", width: 20 },
    { header: "Member", key: "member", width: 28 },
    { header: "Member code", key: "code", width: 16 },
    { header: "Amount", key: "amount", width: 14 },
    { header: "Method", key: "method", width: 16 },
    { header: "Status", key: "status", width: 16 },
    { header: "Reference", key: "reference", width: 24 },
    { header: "Notes", key: "notes", width: 30 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const r of rows) {
    sheet.addRow({
      date: r.paidAt ? new Date(r.paidAt).toISOString().slice(0, 19).replace("T", " ") : "",
      member: `${r.firstName} ${r.lastName}`,
      code: r.memberCode,
      amount: Number(r.amount),
      method: r.method,
      status: r.status,
      reference: r.reference ?? "",
      notes: r.notes ?? "",
    });
  }
  sheet.getColumn("amount").numFmt = "#,##0.00";

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="district-gym-payments-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
