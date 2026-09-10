"use server";

import { db, schema } from "@/db";
import { requireStaff } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function createStaff(formData: FormData) {
  const { userId } = await requireStaff(["ADMIN"]);
  const name = String(formData.get("name"));
  const email = String(formData.get("email")).toLowerCase();
  const role = String(formData.get("role")) as any;
  const password = String(formData.get("password") || "changeme123");

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(schema.users).values({ name, email, passwordHash, role }).returning();

  await logAudit({ actorUserId: userId, action: "staff.created", entityType: "user", entityId: user.id, details: { role } });
  revalidatePath("/admin/staff");
}

export async function toggleStaffActive(formData: FormData) {
  const { userId } = await requireStaff(["ADMIN"]);
  const id = Number(formData.get("id"));
  const active = formData.get("active") === "true";
  await db.update(schema.users).set({ active: !active }).where(eq(schema.users.id, id));
  await logAudit({ actorUserId: userId, action: "staff.toggled", entityType: "user", entityId: id, details: { active: !active } });
  revalidatePath("/admin/staff");
}
