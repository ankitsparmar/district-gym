"use server";

import { db, schema } from "@/db";
import { requireStaff } from "@/lib/rbac";
import { notify } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { formatMoney, formatDate } from "@/lib/business";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type SmsReminderState = { error?: string; success?: string };

// Lets front-desk/admin/manager staff push an ad-hoc payment reminder SMS to
// a member straight from the members list, independent of the automatic
// daily reminder cron (src/app/api/cron/reminders/route.ts). Uses the same
// Twilio-backed notify() layer, so it's logged to the notifications table
// and shows real errors (e.g. Twilio not configured yet) instead of
// pretending to succeed.
export async function sendManualPaymentReminderSms(
  _prev: SmsReminderState,
  formData: FormData
): Promise<SmsReminderState> {
  const { userId } = await requireStaff(["ADMIN", "MANAGER", "FRONT_DESK"]);
  const memberId = Number(formData.get("memberId"));
  if (!memberId) return { error: "Missing member" };

  const [member] = await db.select().from(schema.members).where(eq(schema.members.id, memberId)).limit(1);
  if (!member) return { error: "Member not found" };
  if (!member.phone) {
    return { error: `${member.firstName} ${member.lastName} has no phone number on file — add one before texting a reminder.` };
  }

  const [membership] = await db
    .select()
    .from(schema.memberships)
    .where(eq(schema.memberships.memberId, memberId))
    .orderBy(desc(schema.memberships.createdAt))
    .limit(1);

  const dueBit = membership?.nextDueDate
    ? ` of ${formatMoney(membership.priceAtSignup)} is due on ${formatDate(membership.nextDueDate)}`
    : "";

  const result = await notify({
    memberId,
    channel: "SMS",
    type: "PAYMENT_REMINDER_MANUAL",
    body: `Hi ${member.firstName}, this is a reminder from District Gym that your membership payment${dueBit}. Please settle this at your earliest convenience or contact the front desk with any questions.`,
  });

  await logAudit({
    actorUserId: userId,
    action: "notification.manual_sms_reminder",
    entityType: "member",
    entityId: memberId,
    details: { ok: result.ok, reason: !result.ok ? result.reason : undefined },
  });

  revalidatePath("/admin/members");

  if (!result.ok) {
    const detail = "error" in result && result.error ? result.error : result.reason;
    return { error: `Couldn't send SMS to ${member.firstName}: ${detail}` };
  }
  return { success: `SMS reminder sent to ${member.firstName} ${member.lastName}` };
}
