import { requireMember } from "@/lib/rbac";
import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { Card, CardHeader, Badge, StatCard } from "@/components/ui/primitives";
import { formatDate, formatMoney, classifyDueDate } from "@/lib/business";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const { memberId } = await requireMember();
  const [member] = await db.select().from(schema.members).where(eq(schema.members.id, memberId)).limit(1);
  const [membership] = await db
    .select()
    .from(schema.memberships)
    .where(eq(schema.memberships.memberId, memberId))
    .orderBy(desc(schema.memberships.createdAt))
    .limit(1);
  const plan = membership ? (await db.select().from(schema.plans).where(eq(schema.plans.id, membership.planId)).limit(1))[0] : undefined;
  const recentAttendance = await db
    .select()
    .from(schema.attendance)
    .where(eq(schema.attendance.memberId, memberId))
    .orderBy(desc(schema.attendance.checkInAt))
    .limit(5);

  const qrDataUrl = member ? await QRCode.toDataURL(member.memberCode, { margin: 1, width: 160 }) : null;
  const dueBucket = membership ? classifyDueDate(membership.nextDueDate ? new Date(membership.nextDueDate) : null) : "OK";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--dg-ink)]">Welcome back, {member?.firstName}</h1>
        <p className="text-sm text-[var(--dg-slate)]">{member?.memberCode}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Membership status" value={member?.status ?? "—"} />
        <StatCard label="Plan" value={plan?.name ?? "—"} />
        <StatCard
          label="Next payment due"
          value={membership?.nextDueDate ? formatDate(membership.nextDueDate) : "—"}
          sub={dueBucket !== "OK" ? dueBucket.replace("_", " ") : undefined}
          tone={dueBucket === "OVERDUE" ? "down" : dueBucket === "OK" ? "neutral" : "up"}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Card className="flex flex-col items-center gap-3 p-6">
          <p className="text-sm font-semibold text-[var(--dg-ink)]">Your check-in QR code</p>
          {qrDataUrl && <img src={qrDataUrl} alt="QR code" className="h-40 w-40" />}
          <p className="text-xs text-[var(--dg-slate)]">Show this at the front desk to check in.</p>
        </Card>

        <Card>
          <CardHeader title="Recent check-ins" />
          <div className="divide-y divide-[var(--dg-line)]">
            {recentAttendance.length === 0 && <p className="px-5 py-6 text-sm text-[var(--dg-slate)]">No visits yet.</p>}
            {recentAttendance.map((a) => (
              <div key={a.id} className="px-5 py-3 text-sm text-[var(--dg-ink)]">
                {formatDate(a.checkInAt)}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
