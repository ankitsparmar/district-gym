import { db } from "@/db";
import { sql } from "drizzle-orm";
import { memberCode as formatMemberCode, invoiceNumber as formatInvoiceNumber } from "@/lib/business";

export async function nextMemberCode() {
  const result: any = await db.execute(sql`select nextval('member_code_seq') as nextval`);
  const row = result.rows ? result.rows[0] : result[0];
  return formatMemberCode(Number(row.nextval));
}

export async function nextInvoiceNumber() {
  const result: any = await db.execute(sql`select nextval('invoice_number_seq') as nextval`);
  const row = result.rows ? result.rows[0] : result[0];
  return formatInvoiceNumber(Number(row.nextval));
}
