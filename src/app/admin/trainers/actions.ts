"use server";

import { db, schema } from "@/db";
import { requireStaff } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function createTrainer(formData: FormData) {
  const { userId } = await requireStaff(["ADMIN", "MANAGER"]);
  const name = String(formData.get("name"));
  const email = String(formData.get("email")).toLowerCase();
  const bio = String(formData.get("bio") || "");
  const specialties = String(formData.get("specialties") || "");
  const commissionRate = String(formData.get("commissionRate") || "0");
  const password = String(formData.get("password") || "changeme123");

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(schema.users)
    .values({ name, email, passwordHash, role: "TRAINER" })
    .returning();

  const [trainer] = await db
    .insert(schema.trainers)
    .values({ userId: user.id, bio, specialties, commissionRate })
    .returning();

  await logAudit({ actorUserId: userId, action: "trainer.created", entityType: "trainer", entityId: trainer.id });
  revalidatePath("/admin/trainers");
}

export async function schedulePtSession(formData: FormData) {
  const { userId } = await requireStaff();
  const trainerId = Number(formData.get("trainerId"));
  const memberId = Number(formData.get("memberId"));
  const scheduledAt = String(formData.get("scheduledAt"));
  const durationMinutes = Number(formData.get("durationMinutes") || 60);
  const price = formData.get("price") ? String(formData.get("price")) : null;

  await db.insert(schema.ptSessions).values({
    trainerId,
    memberId,
    scheduledAt: new Date(scheduledAt),
    durationMinutes,
    price,
  });

  await logAudit({ actorUserId: userId, action: "pt_session.scheduled", entityType: "trainer", entityId: trainerId });
  revalidatePath("/admin/trainers");
  revalidatePath("/admin/classes");
}

export async function completePtSession(formData: FormData) {
  const { userId } = await requireStaff();
  const sessionId = Number(formData.get("sessionId"));

  const [session] = await db.select().from(schema.ptSessions).where(eq(schema.ptSessions.id, sessionId)).limit(1);
  if (!session) return;

  await db.update(schema.ptSessions).set({ status: "COMPLETED" }).where(eq(schema.ptSessions.id, sessionId));

  if (session.price) {
    const [trainer] = await db.select().from(schema.trainers).where(eq(schema.trainers.id, session.trainerId)).limit(1);
    const rate = trainer?.commissionRate ? Number(trainer.commissionRate) / 100 : 0;
    if (rate > 0) {
      const amount = (Number(session.price) * rate).toFixed(2);
      await db.insert(schema.commissions).values({
        trainerId: session.trainerId,
        ptSessionId: session.id,
        amount,
      });
    }
  }

  await logAudit({ actorUserId: userId, action: "pt_session.completed", entityType: "pt_session", entityId: sessionId });
  revalidatePath("/admin/trainers");
}

export async function cancelPtSession(formData: FormData) {
  await requireStaff();
  const sessionId = Number(formData.get("sessionId"));
  await db.update(schema.ptSessions).set({ status: "CANCELLED" }).where(eq(schema.ptSessions.id, sessionId));
  revalidatePath("/admin/trainers");
}

export async function markCommissionPaid(formData: FormData) {
  const { userId } = await requireStaff(["ADMIN", "MANAGER"]);
  const commissionId = Number(formData.get("commissionId"));
  await db.update(schema.commissions).set({ status: "PAID", paidAt: new Date() }).where(eq(schema.commissions.id, commissionId));
  await logAudit({ actorUserId: userId, action: "commission.paid", entityType: "commission", entityId: commissionId });
  revalidatePath("/admin/trainers");
  revalidatePath("/admin/finance");
}
