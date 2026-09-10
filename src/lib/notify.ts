import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

/**
 * Notification layer for District Gym.
 *
 * Wired to real providers (SendGrid for email, Twilio for SMS) using the
 * SDKs below. When the relevant API keys are not present in the environment
 * (e.g. local/dev), sends are logged to the `notifications` table with
 * status QUEUED/FAILED and a clear error message instead of throwing, so the
 * rest of the app (reminders, approvals, etc.) keeps working end-to-end.
 *
 * To go live: set SENDGRID_API_KEY + SENDGRID_FROM_EMAIL and
 * TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER in .env.
 */

type Channel = "EMAIL" | "SMS" | "PUSH";
type NotifType =
  | "PAYMENT_UPCOMING"
  | "PAYMENT_DUE_TODAY"
  | "PAYMENT_OVERDUE"
  | "WELCOME"
  | "REGISTRATION_APPROVED"
  | "REGISTRATION_REJECTED"
  | "FREEZE_CONFIRMED"
  | "SUSPENSION_NOTICE"
  | "CLASS_BOOKING_CONFIRMED"
  | "GENERIC";

export interface SendParams {
  memberId?: number;
  channel: Channel;
  type: NotifType;
  to?: string; // email address or phone number; if omitted, looked up from member
  subject?: string;
  body: string;
}

async function sendEmailViaSendGrid(to: string, subject: string, body: string) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.SENDGRID_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error("SendGrid not configured (SENDGRID_API_KEY / SENDGRID_FROM_EMAIL missing)");
  }
  const sgMail = (await import("@sendgrid/mail")).default;
  sgMail.setApiKey(apiKey);
  await sgMail.send({
    to,
    from,
    subject,
    text: body,
    html: `<p>${body.replace(/\n/g, "<br/>")}</p>`,
  });
}

async function sendSmsViaTwilio(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    throw new Error("Twilio not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER missing)");
  }
  const twilio = (await import("twilio")).default;
  const client = twilio(sid, token);
  await client.messages.create({ to, from, body });
}

async function sendPush(_to: string, _body: string) {
  // Web Push (VAPID) is scaffolded via NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY.
  // Wire up a push subscription store + web-push library to complete this channel.
  throw new Error("Push notifications not configured yet");
}

export async function notify(params: SendParams) {
  let to = params.to;
  let member: typeof schema.members.$inferSelect | undefined;

  if (params.memberId) {
    const [m] = await db.select().from(schema.members).where(
      eq(schema.members.id, params.memberId)
    ).limit(1);
    member = m;
    if (!to) to = params.channel === "SMS" ? member?.phone ?? undefined : member?.email ?? undefined;
  }

  const [row] = await db
    .insert(schema.notifications)
    .values({
      memberId: params.memberId,
      channel: params.channel,
      type: params.type,
      subject: params.subject,
      body: params.body,
      status: "QUEUED",
    })
    .returning();

  if (!to) {
    await db
      .update(schema.notifications)
      .set({ status: "FAILED", error: "No destination address/number on file" })
      .where(eq(schema.notifications.id, row.id));
    return { ok: false, reason: "no-destination" as const };
  }

  try {
    if (params.channel === "EMAIL") {
      await sendEmailViaSendGrid(to, params.subject ?? "District Gym", params.body);
    } else if (params.channel === "SMS") {
      await sendSmsViaTwilio(to, params.body);
    } else {
      await sendPush(to, params.body);
    }
    await db
      .update(schema.notifications)
      .set({ status: "SENT", sentAt: new Date() })
      .where(eq(schema.notifications.id, row.id));
    return { ok: true as const };
  } catch (err: any) {
    // Dev-mode fallback: not configured -> log clearly but don't crash callers.
    await db
      .update(schema.notifications)
      .set({ status: "FAILED", error: String(err?.message ?? err) })
      .where(eq(schema.notifications.id, row.id));
    console.warn(`[notify] ${params.channel} send failed (logged to notifications table):`, err?.message);
    return { ok: false, reason: "send-failed" as const, error: String(err?.message ?? err) };
  }
}

export async function notifyBothChannels(opts: {
  memberId: number;
  type: NotifType;
  subject: string;
  body: string;
}) {
  await Promise.allSettled([
    notify({ memberId: opts.memberId, channel: "EMAIL", type: opts.type, subject: opts.subject, body: opts.body }),
    notify({ memberId: opts.memberId, channel: "SMS", type: opts.type, body: opts.body }),
  ]);
}
