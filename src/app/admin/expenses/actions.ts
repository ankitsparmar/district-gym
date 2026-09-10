"use server";

import { db, schema } from "@/db";
import { requireStaff } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function createExpense(formData: FormData) {
  const { userId } = await requireStaff(["ADMIN", "MANAGER"]);
  const category = String(formData.get("category")) as any;
  const description = String(formData.get("description") || "");
  const amount = String(formData.get("amount"));
  const date = String(formData.get("date"));

  const [expense] = await db.insert(schema.expenses).values({ category, description, amount, date, recordedBy: userId }).returning();
  await logAudit({ actorUserId: userId, action: "expense.created", entityType: "expense", entityId: expense.id, details: { category, amount } });
  revalidatePath("/admin/expenses");
  revalidatePath("/admin/finance");
}
