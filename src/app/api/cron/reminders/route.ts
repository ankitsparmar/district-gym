import { db, schema } from "@/db";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { classifyDueDate } from "@/lib/business";
import { notifyBothChannels } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { differenceInCalendarDays } from "date-fns";

const AUTO_SUSPEND_AFTER_DAYS = Number(process.env.AUTO_SUSPEND_AFTER_DAYS ?? 7);
const REMINDER_WINDOW_DAYS = Number(process.env.REMINDER_WINDOW_DAYS ?? 3);

async function alreadyNotifiedToday(memberId: number, type: string) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const rows = await db
    .select({ id: schema.notifications.id })
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.memberId, memberId),
        eq(schema.notifications.type, type as any),
        gte(schema.notifications.createdAt, since)
      )
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * Daily reminder + auto-suspend job.
 *
 * This is designed to be called by an external scheduler (cron job, Vercel
 * Cron, GitHub Actions, etc.) once per day, e.g.:
 *   curl -X POST https://yourapp.com/api/cron/reminders \
 *     -H "Authorization: Bearer $CRON_SECRET"
 *
 * It sends upcoming/due-today/overdue payment reminders (email + SMS) and
 * auto-suspends memberships that have been overdue for longer than
 * AUTO_SUSPEND_AFTER_DAYS.
 */
async function runReminders() {
  const activeMemberships = await db
    .select({
      id: schema.memberships.id,
      memberId: schema.memberships.memberId,
      nextDueDate: schema.memberships.nextDueDate,
      status: schema.memberships.status,
      firstName: schema.members.firstName,
      lastName: schema.members.lastName,
    })
    .from(schema.memberships)
    .innerJoin(schema.members, eq(schema.members.id, schema.memberships.memberId))
    .where(and(eq(schema.memberships.status, "ACTIVE"), sql`${schema.memberships.nextDueDate} is not null`));

  let upcomingCount = 0;
  let dueTodayCount = 0;
  let overdueCount = 0;
  let suspendedCount = 0;

  for (const m of activeMemberships) {
    if (!m.nextDueDate) continue;
    const dueDate = new Date(m.nextDueDate);
    const bucket = classifyDueDate(dueDate, REMINDER_WINDOW_DAYS);

    if (bucket === "UPCOMING") {
      if (!(await alreadyNotifiedToday(m.memberId, "PAYMENT_UPCOMING"))) {
        await notifyBothChannels({
          memberId: m.memberId,
          type: "PAYMENT_UPCOMING",
          subject: "Your District Gym payment is coming up",
          body: `Hi ${m.firstName}, your next payment of your membership is due on ${dueDate.toDateString()}. Please visit the front desk or pay online to stay active.`,
        });
        upcomingCount++;
      }
    } else if (bucket === "DUE_TODAY") {
      if (!(await alreadyNotifiedToday(m.memberId, "PAYMENT_DUE_TODAY"))) {
        await notifyBothChannels({
          memberId: m.memberId,
          type: "PAYMENT_DUE_TODAY",
          subject: "Your District Gym payment is due today",
          body: `Hi ${m.firstName}, your membership payment is due today (${dueDate.toDateString()}). Please settle this to avoid disruption to your access.`,
        });
        dueTodayCount++;
      }
    } else if (bucket === "OVERDUE") {
      const daysOverdue = -differenceInCalendarDays(dueDate, new Date());
      if (!(await alreadyNotifiedToday(m.memberId, "PAYMENT_OVERDUE"))) {
        await notifyBothChannels({
          memberId: m.memberId,
          type: "PAYMENT_OVERDUE",
          subject: "Your District Gym payment is overdue",
          body: `Hi ${m.firstName}, your membership payment is now ${daysOverdue} day(s) overdue. ${
            daysOverdue >= AUTO_SUSPEND_AFTER_DAYS
              ? "Your access will be suspended if this isn't resolved immediately."
              : `Your access may be suspended after ${AUTO_SUSPEND_AFTER_DAYS} days overdue.`
          }`,
        });
        overdueCount++;
      }

      if (daysOverdue >= AUTO_SUSPEND_AFTER_DAYS) {
        await db.update(schema.memberships).set({ status: "SUSPENDED" }).where(eq(schema.memberships.id, m.id));
        await db.update(schema.members).set({ status: "SUSPENDED", updatedAt: new Date() }).where(eq(schema.members.id, m.memberId));
        await notifyBothChannels({
          memberId: m.memberId,
          type: "SUSPENSION_NOTICE",
          subject: "Your District Gym access has been suspended",
          body: `Hi ${m.firstName}, your access has been automatically suspended due to a payment ${daysOverdue} days overdue. Please contact the front desk to reactivate.`,
        });
        await logAudit({
          action: "system.auto_suspend",
          entityType: "membership",
          entityId: m.id,
          details: { daysOverdue },
        });
        suspendedCount++;
      }
    }
  }

  return {
    checked: activeMemberships.length,
    upcomingRemindersSent: upcomingCount,
    dueTodayRemindersSent: dueTodayCount,
    overdueRemindersSent: overdueCount,
    autoSuspended: suspendedCount,
  };
}

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev fallback: no secret configured
  const header = req.headers.get("authorization");
  const url = new URL(req.url);
  const queryToken = url.searchParams.get("secret");
  return header === `Bearer ${secret}` || queryToken === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runReminders();
  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), ...result });
}

export async function POST(req: Request) {
  return GET(req);
}
