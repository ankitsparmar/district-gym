"use server";

import { db, schema } from "@/db";
import { requireStaff } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { notifyBothChannels } from "@/lib/notify";
import { nextInvoiceNumber } from "@/lib/codes";
import { computeNextDueDate } from "@/lib/business";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

async function approveOne(registrationId: number, staffUserId: number, notes?: string) {
  const [reg] = await db
    .select()
    .from(schema.registrations)
    .where(eq(schema.registrations.id, registrationId))
    .limit(1);
  if (!reg || reg.status !== "PENDING") return;

  const [member] = await db.select().from(schema.members).where(eq(schema.members.id, reg.memberId)).limit(1);
  if (!member) return;

  const planId = reg.requestedPlanId;
  if (!planId) return;
  const [plan] = await db.select().from(schema.plans).where(eq(schema.plans.id, planId)).limit(1);
  if (!plan) return;

  const today = new Date();
  const nextDueDate =
    plan.type === "PAY_PER_VISIT" ? null : computeNextDueDate(today, plan.billingIntervalMonths);

  const [membership] = await db
    .insert(schema.memberships)
    .values({
      memberId: member.id,
      planId: plan.id,
      status: "ACTIVE",
      startDate: today.toISOString().slice(0, 10),
      nextDueDate: nextDueDate ? nextDueDate.toISOString().slice(0, 10) : null,
      priceAtSignup: plan.price,
      visitsRemaining: plan.visitsIncluded ?? null,
    })
    .returning();

  await db.insert(schema.membershipChanges).values({
    membershipId: membership.id,
    toPlanId: plan.id,
    type: "INITIAL",
    reason: "Registration approved",
    createdBy: staffUserId,
  });

  const invoiceNumber = await nextInvoiceNumber();
  const [invoice] = await db
    .insert(schema.invoices)
    .values({
      invoiceNumber,
      memberId: member.id,
      membershipId: membership.id,
      subtotal: plan.price,
      taxRate: "0",
      taxAmount: "0",
      total: plan.price,
      status: "PAID",
      lineItems: [{ description: `${plan.name} membership`, amount: plan.price }],
      issueDate: today.toISOString().slice(0, 10),
      dueDate: today.toISOString().slice(0, 10),
    })
    .returning();

  // Confirm any pending payment captured at registration time.
  await db
    .update(schema.payments)
    .set({ status: "COMPLETED", membershipId: membership.id, invoiceId: invoice.id, recordedBy: staffUserId })
    .where(and(eq(schema.payments.memberId, member.id), eq(schema.payments.status, "PENDING")));

  // Provision member portal login on first approval.
  let tempPassword: string | undefined;
  if (!member.loginEmail && member.email) {
    tempPassword = crypto.randomBytes(4).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await db.update(schema.members).set({ loginEmail: member.email, passwordHash }).where(eq(schema.members.id, member.id));
  }

  await db
    .update(schema.members)
    .set({ status: "ACTIVE", updatedAt: new Date() })
    .where(eq(schema.members.id, member.id));

  await db
    .update(schema.registrations)
    .set({ status: "APPROVED", reviewedBy: staffUserId, reviewedAt: new Date(), reviewNotes: notes })
    .where(eq(schema.registrations.id, registrationId));

  await notifyBothChannels({
    memberId: member.id,
    type: "REGISTRATION_APPROVED",
    subject: "Welcome to District Gym!",
    body: `Hi ${member.firstName}, your membership is confirmed on the ${plan.name} plan. ${
      nextDueDate ? `Your next payment is due ${nextDueDate.toDateString()}.` : ""
    } See you at the gym!${
      tempPassword
        ? ` Sign in to your member portal at /member-login with ${member.email} and temporary password ${tempPassword} (please change it after logging in).`
        : ""
    }`,
  });

  await logAudit({
    actorUserId: staffUserId,
    action: "registration.approved",
    entityType: "registration",
    entityId: registrationId,
    details: { memberId: member.id, planId: plan.id },
  });
}

export async function approveRegistration(formData: FormData) {
  const { userId } = await requireStaff(["ADMIN", "MANAGER"]);
  const id = Number(formData.get("registrationId"));
  const notes = String(formData.get("notes") ?? "");
  await approveOne(id, userId, notes);
  revalidatePath("/admin/registrations");
  revalidatePath("/admin");
  redirect("/admin/registrations");
}

export async function rejectRegistration(formData: FormData) {
  const { userId } = await requireStaff(["ADMIN", "MANAGER"]);
  const id = Number(formData.get("registrationId"));
  const notes = String(formData.get("notes") ?? "");
  if (!notes.trim()) {
    throw new Error("A reason is required to reject a registration.");
  }

  const [reg] = await db.select().from(schema.registrations).where(eq(schema.registrations.id, id)).limit(1);
  if (!reg || reg.status !== "PENDING") {
    redirect("/admin/registrations");
  }

  const [member] = await db.select().from(schema.members).where(eq(schema.members.id, reg.memberId)).limit(1);

  await db
    .update(schema.registrations)
    .set({ status: "REJECTED", reviewedBy: userId, reviewedAt: new Date(), reviewNotes: notes })
    .where(eq(schema.registrations.id, id));

  if (member) {
    await notifyBothChannels({
      memberId: member.id,
      type: "REGISTRATION_REJECTED",
      subject: "Update on your District Gym application",
      body: `Hi ${member.firstName}, unfortunately we're unable to confirm your membership application at this time. Reason: ${notes}. Please contact the front desk if you have questions.`,
    });
  }

  await logAudit({
    actorUserId: userId,
    action: "registration.rejected",
    entityType: "registration",
    entityId: id,
    details: { reason: notes },
  });

  revalidatePath("/admin/registrations");
  revalidatePath("/admin");
  redirect("/admin/registrations");
}

export async function bulkApproveRegistrations(formData: FormData) {
  const { userId } = await requireStaff(["ADMIN", "MANAGER"]);
  const ids = formData.getAll("ids").map((v) => Number(v)).filter(Boolean);
  for (const id of ids) {
    await approveOne(id, userId, "Bulk approved (verified walk-in)");
  }
  revalidatePath("/admin/registrations");
  revalidatePath("/admin");
  redirect("/admin/registrations");
}
