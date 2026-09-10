"use server";

import { db, schema } from "@/db";
import { requireStaff } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { notify, notifyBothChannels } from "@/lib/notify";
import { nextInvoiceNumber } from "@/lib/codes";
import { computeNextDueDate, computeProration } from "@/lib/business";
import { and, eq, isNull, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { differenceInCalendarDays, addDays } from "date-fns";

function revalidateMember(memberId: number) {
  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath("/admin/members");
  revalidatePath("/admin");
}

// --- Tags ---------------------------------------------------------------

export async function addTag(formData: FormData) {
  const { userId } = await requireStaff();
  const memberId = Number(formData.get("memberId"));
  const tag = String(formData.get("tag") ?? "").trim();
  if (!tag) return;
  await db.insert(schema.memberTags).values({ memberId, tag, addedBy: userId }).onConflictDoNothing();
  revalidateMember(memberId);
}

export async function removeTag(formData: FormData) {
  await requireStaff();
  const memberId = Number(formData.get("memberId"));
  const tagId = Number(formData.get("tagId"));
  await db.delete(schema.memberTags).where(eq(schema.memberTags.id, tagId));
  revalidateMember(memberId);
}

// --- Membership: freeze / unfreeze --------------------------------------

export async function freezeMembership(formData: FormData) {
  const { userId } = await requireStaff();
  const membershipId = Number(formData.get("membershipId"));
  const memberId = Number(formData.get("memberId"));
  const startDate = String(formData.get("startDate"));
  const endDate = String(formData.get("endDate") || "");
  const reason = String(formData.get("reason") || "");

  await db.insert(schema.membershipFreezes).values({
    membershipId,
    startDate,
    endDate: endDate || null,
    reason,
    createdBy: userId,
  });
  await db.update(schema.memberships).set({ status: "FROZEN" }).where(eq(schema.memberships.id, membershipId));
  await db.update(schema.members).set({ status: "FROZEN", updatedAt: new Date() }).where(eq(schema.members.id, memberId));

  await notifyBothChannels({
    memberId,
    type: "FREEZE_CONFIRMED",
    subject: "Your District Gym membership is now frozen",
    body: `Your membership has been frozen from ${startDate}${endDate ? ` to ${endDate}` : ""}. Reason: ${reason || "n/a"}.`,
  });
  await logAudit({ actorUserId: userId, action: "membership.frozen", entityType: "membership", entityId: membershipId, details: { startDate, endDate, reason } });
  revalidateMember(memberId);
}

export async function unfreezeMembership(formData: FormData) {
  const { userId } = await requireStaff();
  const membershipId = Number(formData.get("membershipId"));
  const memberId = Number(formData.get("memberId"));

  const [membership] = await db.select().from(schema.memberships).where(eq(schema.memberships.id, membershipId)).limit(1);
  const [freeze] = await db
    .select()
    .from(schema.membershipFreezes)
    .where(and(eq(schema.membershipFreezes.membershipId, membershipId), isNull(schema.membershipFreezes.endDate)))
    .orderBy(desc(schema.membershipFreezes.createdAt))
    .limit(1);

  const today = new Date().toISOString().slice(0, 10);
  if (freeze) {
    await db.update(schema.membershipFreezes).set({ endDate: today }).where(eq(schema.membershipFreezes.id, freeze.id));
  }

  // Extend next due date by the number of days frozen, so members aren't charged for frozen time.
  if (membership?.nextDueDate && freeze?.startDate) {
    const frozenDays = differenceInCalendarDays(new Date(today), new Date(freeze.startDate));
    if (frozenDays > 0) {
      const extended = addDays(new Date(membership.nextDueDate), frozenDays);
      await db.update(schema.memberships).set({ nextDueDate: extended.toISOString().slice(0, 10) }).where(eq(schema.memberships.id, membershipId));
    }
  }

  await db.update(schema.memberships).set({ status: "ACTIVE" }).where(eq(schema.memberships.id, membershipId));
  await db.update(schema.members).set({ status: "ACTIVE", updatedAt: new Date() }).where(eq(schema.members.id, memberId));

  await logAudit({ actorUserId: userId, action: "membership.unfrozen", entityType: "membership", entityId: membershipId });
  revalidateMember(memberId);
}

// --- Membership: upgrade / downgrade with proration ----------------------

export async function changePlan(formData: FormData) {
  const { userId } = await requireStaff();
  const membershipId = Number(formData.get("membershipId"));
  const memberId = Number(formData.get("memberId"));
  const newPlanId = Number(formData.get("newPlanId"));

  const [membership] = await db.select().from(schema.memberships).where(eq(schema.memberships.id, membershipId)).limit(1);
  if (!membership) return;
  const [oldPlan] = await db.select().from(schema.plans).where(eq(schema.plans.id, membership.planId)).limit(1);
  const [newPlan] = await db.select().from(schema.plans).where(eq(schema.plans.id, newPlanId)).limit(1);
  if (!oldPlan || !newPlan) return;

  const today = new Date();
  const cycleEnd = membership.nextDueDate ? new Date(membership.nextDueDate) : addDays(today, 30);
  const cycleStart = addDays(cycleEnd, -oldPlan.billingIntervalMonths * 30);

  const oldMonthly = Number(oldPlan.price) / Math.max(1, oldPlan.billingIntervalMonths);
  const newMonthly = Number(newPlan.price) / Math.max(1, newPlan.billingIntervalMonths);

  const proration = computeProration({
    oldPriceMonthly: oldMonthly,
    newPriceMonthly: newMonthly,
    cycleStart,
    cycleEnd,
    changeDate: today,
  });

  const changeType = Number(newPlan.price) > Number(oldPlan.price) ? "UPGRADE" : "DOWNGRADE";

  await db.insert(schema.membershipChanges).values({
    membershipId,
    fromPlanId: oldPlan.id,
    toPlanId: newPlan.id,
    type: changeType,
    prorationAmount: proration.net.toFixed(2),
    reason: `${changeType === "UPGRADE" ? "Upgraded" : "Downgraded"} from ${oldPlan.name} to ${newPlan.name}`,
    createdBy: userId,
  });

  await db
    .update(schema.memberships)
    .set({ planId: newPlan.id, priceAtSignup: newPlan.price })
    .where(eq(schema.memberships.id, membershipId));

  let invoiceNote = "No proration due.";
  if (proration.net > 0) {
    const invoiceNumber = await nextInvoiceNumber();
    await db.insert(schema.invoices).values({
      invoiceNumber,
      memberId,
      membershipId,
      subtotal: proration.net.toFixed(2),
      taxRate: "0",
      taxAmount: "0",
      total: proration.net.toFixed(2),
      status: "UNPAID",
      lineItems: [
        {
          description: `Prorated charge: ${changeType.toLowerCase()} to ${newPlan.name}`,
          amount: proration.net.toFixed(2),
        },
      ],
      issueDate: today.toISOString().slice(0, 10),
      dueDate: today.toISOString().slice(0, 10),
    });
    invoiceNote = `A prorated invoice of ${proration.net.toFixed(2)} has been issued.`;
  } else if (proration.net < 0) {
    invoiceNote = `A credit of ${Math.abs(proration.net).toFixed(2)} applies to your account.`;
  }

  await notifyBothChannels({
    memberId,
    type: "GENERIC",
    subject: "Your District Gym plan has changed",
    body: `Your plan has been changed from ${oldPlan.name} to ${newPlan.name}. ${invoiceNote}`,
  });

  await logAudit({
    actorUserId: userId,
    action: `membership.${changeType.toLowerCase()}`,
    entityType: "membership",
    entityId: membershipId,
    details: { fromPlanId: oldPlan.id, toPlanId: newPlan.id, proration: proration.net },
  });

  revalidateMember(memberId);
}

// --- Membership: direct edit / delete --------------------------------------
// Unlike changePlan (above), this makes no proration calculation or invoice
// — it's a raw correction tool for staff to fix data-entry mistakes
// (wrong start date, wrong price typed at signup, etc.), not a customer-
// facing plan change. Restricted to ADMIN/MANAGER and audit-logged.

export async function updateMembership(formData: FormData) {
  const { userId } = await requireStaff(["ADMIN", "MANAGER"]);
  const membershipId = Number(formData.get("membershipId"));
  const memberId = Number(formData.get("memberId"));
  const planId = Number(formData.get("planId"));
  const status = String(formData.get("status")) as (typeof schema.memberships.$inferSelect)["status"];
  const startDate = String(formData.get("startDate"));
  const nextDueDate = String(formData.get("nextDueDate") || "") || null;
  const priceAtSignup = String(formData.get("priceAtSignup"));
  const visitsRemaining = formData.get("visitsRemaining") ? Number(formData.get("visitsRemaining")) : null;
  const autoRenew = formData.get("autoRenew") === "on";

  const [before] = await db.select().from(schema.memberships).where(eq(schema.memberships.id, membershipId)).limit(1);
  if (!before) return;

  await db
    .update(schema.memberships)
    .set({ planId, status, startDate, nextDueDate, priceAtSignup, visitsRemaining, autoRenew })
    .where(eq(schema.memberships.id, membershipId));

  // Keep the member's own status roughly in sync when an admin edits the
  // membership status directly (mirrors what freeze/suspend/reactivate do).
  // "EXPIRED" has no equivalent on the member record, so leave that as-is.
  const memberStatuses = ["PENDING", "ACTIVE", "FROZEN", "SUSPENDED", "CANCELLED"] as const;
  if (status !== before.status && (memberStatuses as readonly string[]).includes(status)) {
    await db
      .update(schema.members)
      .set({ status: status as (typeof memberStatuses)[number], updatedAt: new Date() })
      .where(eq(schema.members.id, memberId));
  }

  await logAudit({
    actorUserId: userId,
    action: "membership.edited",
    entityType: "membership",
    entityId: membershipId,
    details: { before, after: { planId, status, startDate, nextDueDate, priceAtSignup, visitsRemaining, autoRenew } },
  });
  revalidateMember(memberId);
}

export async function deleteMembership(formData: FormData) {
  const { userId } = await requireStaff(["ADMIN", "MANAGER"]);
  const membershipId = Number(formData.get("membershipId"));
  const memberId = Number(formData.get("memberId"));

  const [membership] = await db.select().from(schema.memberships).where(eq(schema.memberships.id, membershipId)).limit(1);
  if (!membership) return;

  // Invoices/payments are financial records — detach rather than cascade-
  // delete them, so a membership correction never erases the money trail.
  // membershipChanges and membershipFreezes DO cascade (they're just history
  // of the membership itself, meaningless once it's gone).
  await db.update(schema.invoices).set({ membershipId: null }).where(eq(schema.invoices.membershipId, membershipId));
  await db.update(schema.payments).set({ membershipId: null }).where(eq(schema.payments.membershipId, membershipId));
  await db.delete(schema.memberships).where(eq(schema.memberships.id, membershipId));

  await logAudit({
    actorUserId: userId,
    action: "membership.deleted",
    entityType: "membership",
    entityId: membershipId,
    details: { membership },
  });
  revalidateMember(memberId);
}

// --- Payments -------------------------------------------------------------

export async function recordRenewalPayment(formData: FormData) {
  const { userId } = await requireStaff();
  const membershipId = Number(formData.get("membershipId"));
  const memberId = Number(formData.get("memberId"));
  const method = String(formData.get("method")) as any;
  const reference = String(formData.get("reference") || "");

  const [membership] = await db.select().from(schema.memberships).where(eq(schema.memberships.id, membershipId)).limit(1);
  if (!membership) return;
  const [plan] = await db.select().from(schema.plans).where(eq(schema.plans.id, membership.planId)).limit(1);
  if (!plan) return;

  const invoiceNumber = await nextInvoiceNumber();
  const today = new Date();
  const [invoice] = await db
    .insert(schema.invoices)
    .values({
      invoiceNumber,
      memberId,
      membershipId,
      subtotal: plan.price,
      taxRate: "0",
      taxAmount: "0",
      total: plan.price,
      status: "PAID",
      lineItems: [{ description: `${plan.name} — renewal`, amount: plan.price }],
      issueDate: today.toISOString().slice(0, 10),
      dueDate: today.toISOString().slice(0, 10),
    })
    .returning();

  await db.insert(schema.payments).values({
    memberId,
    membershipId,
    invoiceId: invoice.id,
    amount: plan.price,
    method,
    status: "COMPLETED",
    reference,
    recordedBy: userId,
  });

  const newDue = computeNextDueDate(
    membership.nextDueDate && new Date(membership.nextDueDate) > today ? new Date(membership.nextDueDate) : today,
    plan.billingIntervalMonths
  );

  await db
    .update(schema.memberships)
    .set({ nextDueDate: newDue.toISOString().slice(0, 10), status: "ACTIVE" })
    .where(eq(schema.memberships.id, membershipId));
  await db.update(schema.members).set({ status: "ACTIVE", updatedAt: new Date() }).where(eq(schema.members.id, memberId));

  await db.insert(schema.membershipChanges).values({
    membershipId,
    toPlanId: plan.id,
    type: "RENEWAL",
    reason: "Renewal payment recorded",
    createdBy: userId,
  });

  await logAudit({ actorUserId: userId, action: "payment.renewal", entityType: "membership", entityId: membershipId, details: { amount: plan.price, method } });
  revalidateMember(memberId);
  revalidatePath("/admin/finance");
}

export async function recordAdHocPayment(formData: FormData) {
  const { userId } = await requireStaff();
  const memberId = Number(formData.get("memberId"));
  const amount = String(formData.get("amount"));
  const method = String(formData.get("method")) as any;
  const reference = String(formData.get("reference") || "");
  const notes = String(formData.get("notes") || "");

  const invoiceNumber = await nextInvoiceNumber();
  const today = new Date();
  const [invoice] = await db
    .insert(schema.invoices)
    .values({
      invoiceNumber,
      memberId,
      subtotal: amount,
      taxRate: "0",
      taxAmount: "0",
      total: amount,
      status: "PAID",
      lineItems: [{ description: notes || "Miscellaneous payment", amount }],
      issueDate: today.toISOString().slice(0, 10),
      dueDate: today.toISOString().slice(0, 10),
    })
    .returning();

  await db.insert(schema.payments).values({
    memberId,
    invoiceId: invoice.id,
    amount,
    method,
    status: "COMPLETED",
    reference,
    notes,
    recordedBy: userId,
  });

  await logAudit({ actorUserId: userId, action: "payment.adhoc", entityType: "member", entityId: memberId, details: { amount, method } });
  revalidateMember(memberId);
  revalidatePath("/admin/finance");
}

export async function issueRefund(formData: FormData) {
  const { userId } = await requireStaff(["ADMIN", "MANAGER"]);
  const paymentId = Number(formData.get("paymentId"));
  const memberId = Number(formData.get("memberId"));
  const amount = String(formData.get("amount"));
  const reason = String(formData.get("reason") || "");

  await db.insert(schema.refunds).values({ paymentId, amount, reason, processedBy: userId });

  const [payment] = await db.select().from(schema.payments).where(eq(schema.payments.id, paymentId)).limit(1);
  if (payment) {
    const isFull = Number(amount) >= Number(payment.amount);
    await db
      .update(schema.payments)
      .set({ status: isFull ? "REFUNDED" : "PARTIAL_REFUND" })
      .where(eq(schema.payments.id, paymentId));
  }

  await logAudit({ actorUserId: userId, action: "payment.refunded", entityType: "payment", entityId: paymentId, details: { amount, reason } });
  revalidateMember(memberId);
  revalidatePath("/admin/finance");
}

// --- Status: suspend / reactivate -----------------------------------------

export async function suspendMember(formData: FormData) {
  const { userId } = await requireStaff();
  const memberId = Number(formData.get("memberId"));
  const membershipId = formData.get("membershipId") ? Number(formData.get("membershipId")) : undefined;

  await db.update(schema.members).set({ status: "SUSPENDED", updatedAt: new Date() }).where(eq(schema.members.id, memberId));
  if (membershipId) {
    await db.update(schema.memberships).set({ status: "SUSPENDED" }).where(eq(schema.memberships.id, membershipId));
  }
  await notifyBothChannels({
    memberId,
    type: "SUSPENSION_NOTICE",
    subject: "Your District Gym access has been suspended",
    body: "Your gym access has been suspended. Please contact the front desk to resolve this.",
  });
  await logAudit({ actorUserId: userId, action: "member.suspended", entityType: "member", entityId: memberId });
  revalidateMember(memberId);
}

export async function reactivateMember(formData: FormData) {
  const { userId } = await requireStaff();
  const memberId = Number(formData.get("memberId"));
  const membershipId = formData.get("membershipId") ? Number(formData.get("membershipId")) : undefined;

  await db.update(schema.members).set({ status: "ACTIVE", updatedAt: new Date() }).where(eq(schema.members.id, memberId));
  if (membershipId) {
    await db.update(schema.memberships).set({ status: "ACTIVE" }).where(eq(schema.memberships.id, membershipId));
  }
  await logAudit({ actorUserId: userId, action: "member.reactivated", entityType: "member", entityId: memberId });
  revalidateMember(memberId);
}

// --- Communications ---------------------------------------------------------

export async function addCommunication(formData: FormData) {
  const { userId } = await requireStaff();
  const memberId = Number(formData.get("memberId"));
  const type = String(formData.get("type")) as any;
  const subject = String(formData.get("subject") || "");
  const body = String(formData.get("body") || "");

  await db.insert(schema.communications).values({ memberId, type, subject, body, direction: "OUTBOUND", createdBy: userId });
  await logAudit({ actorUserId: userId, action: "communication.logged", entityType: "member", entityId: memberId, details: { type } });
  revalidateMember(memberId);
}

// --- Goals ---------------------------------------------------------------

export async function addGoal(formData: FormData) {
  await requireStaff();
  const memberId = Number(formData.get("memberId"));
  const goalType = String(formData.get("goalType"));
  const description = String(formData.get("description") || "");
  const targetValue = formData.get("targetValue") ? String(formData.get("targetValue")) : null;
  const currentValue = formData.get("currentValue") ? String(formData.get("currentValue")) : null;
  const unit = String(formData.get("unit") || "");
  const targetDate = formData.get("targetDate") ? String(formData.get("targetDate")) : null;

  await db.insert(schema.goals).values({ memberId, goalType, description, targetValue, currentValue, unit, targetDate });
  revalidateMember(memberId);
}

export async function updateGoalProgress(formData: FormData) {
  await requireStaff();
  const goalId = Number(formData.get("goalId"));
  const memberId = Number(formData.get("memberId"));
  const currentValue = String(formData.get("currentValue"));
  const status = String(formData.get("status") || "IN_PROGRESS");

  await db.update(schema.goals).set({ currentValue, status }).where(eq(schema.goals.id, goalId));
  revalidateMember(memberId);
}

// --- Attendance -----------------------------------------------------------

export async function manualCheckIn(formData: FormData) {
  const { userId } = await requireStaff();
  const memberId = Number(formData.get("memberId"));
  await db.insert(schema.attendance).values({ memberId, method: "MANUAL", recordedBy: userId });
  await logAudit({ actorUserId: userId, action: "attendance.checkin", entityType: "member", entityId: memberId });
  revalidateMember(memberId);
  revalidatePath("/admin/attendance");
}

// --- Basic profile edit -----------------------------------------------------

export async function updateContactInfo(formData: FormData) {
  await requireStaff();
  const memberId = Number(formData.get("memberId"));
  await db
    .update(schema.members)
    .set({
      email: String(formData.get("email") || "") || null,
      phone: String(formData.get("phone") || "") || null,
      address: String(formData.get("address") || "") || null,
      emergencyContactName: String(formData.get("emergencyContactName") || "") || null,
      emergencyContactPhone: String(formData.get("emergencyContactPhone") || "") || null,
      updatedAt: new Date(),
    })
    .where(eq(schema.members.id, memberId));
  revalidateMember(memberId);
}
