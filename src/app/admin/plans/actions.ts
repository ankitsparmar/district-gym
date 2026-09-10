"use server";

import { db, schema } from "@/db";
import { requireStaff } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createPlan(formData: FormData) {
  const { userId } = await requireStaff(["ADMIN", "MANAGER"]);
  const name = String(formData.get("name"));
  const type = String(formData.get("type")) as any;
  const price = String(formData.get("price"));
  const billingIntervalMonths = Number(formData.get("billingIntervalMonths") || 1);
  const visitsIncluded = formData.get("visitsIncluded") ? Number(formData.get("visitsIncluded")) : null;
  const familyMaxMembers = formData.get("familyMaxMembers") ? Number(formData.get("familyMaxMembers")) : null;
  const description = String(formData.get("description") || "");

  const [plan] = await db
    .insert(schema.plans)
    .values({ name, type, price, billingIntervalMonths, visitsIncluded, familyMaxMembers, description })
    .returning();

  await logAudit({ actorUserId: userId, action: "plan.created", entityType: "plan", entityId: plan.id, details: { name, price } });
  revalidatePath("/admin/plans");
  revalidatePath("/");
}

export async function togglePlanActive(formData: FormData) {
  const { userId } = await requireStaff(["ADMIN", "MANAGER"]);
  const id = Number(formData.get("id"));
  const active = formData.get("active") === "true";
  await db.update(schema.plans).set({ active: !active }).where(eq(schema.plans.id, id));
  await logAudit({ actorUserId: userId, action: "plan.toggled", entityType: "plan", entityId: id, details: { active: !active } });
  revalidatePath("/admin/plans");
  revalidatePath("/");
}

export async function updatePlan(formData: FormData) {
  const { userId } = await requireStaff(["ADMIN", "MANAGER"]);
  const id = Number(formData.get("id"));
  const name = String(formData.get("name"));
  const type = String(formData.get("type")) as any;
  const price = String(formData.get("price"));
  const billingIntervalMonths = Number(formData.get("billingIntervalMonths") || 1);
  const visitsIncluded = formData.get("visitsIncluded") ? Number(formData.get("visitsIncluded")) : null;
  const familyMaxMembers = formData.get("familyMaxMembers") ? Number(formData.get("familyMaxMembers")) : null;
  const description = String(formData.get("description") || "");

  const [before] = await db.select().from(schema.plans).where(eq(schema.plans.id, id)).limit(1);
  if (!before) return;

  await db
    .update(schema.plans)
    .set({ name, type, price, billingIntervalMonths, visitsIncluded, familyMaxMembers, description })
    .where(eq(schema.plans.id, id));

  await logAudit({
    actorUserId: userId,
    action: "plan.updated",
    entityType: "plan",
    entityId: id,
    details: { before, after: { name, type, price, billingIntervalMonths, visitsIncluded, familyMaxMembers, description } },
  });
  revalidatePath("/admin/plans");
  revalidatePath("/");
}
