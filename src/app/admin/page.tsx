import { db, schema } from "@/db";
import { and, count, eq, gte, lte, sql, sum } from "drizzle-orm";
import { StatCard, Card, CardHeader, Badge, Button } from "@/components/ui/primitives";
import { formatMoney, formatDate, classifyDueDate } from "@/lib/business";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    activeMembersRow,
    pendingRegRow,
    revenueMonthRow,
    checkedInTodayRow,
    overdueMemberships,
    upcomingBirthdaysUnused,
    recentPayments,
    pendingRegistrations,
  ] = await Promise.all([
    db.select({ c: count() }).from(schema.members).where(eq(schema.members.status, "ACTIVE")),
    db.select({ c: count() }).from(schema.registrations).where(eq(schema.registrations.status, "PENDING")),
    db
      .select({ total: sum(schema.payments.amount) })
      .from(schema.payments)
      .where(and(gte(schema.payments.paidAt, monthStart), eq(schema.payments.status, "COMPLETED"))),
    db.select({ c: count() }).from(schema.attendance).where(gte(schema.attendance.checkInAt, todayStart)),
    db
      .select({
        id: schema.memberships.id,
        memberId: schema.memberships.memberId,
        nextDueDate: schema.memberships.nextDueDate,
        firstName: schema.members.firstName,
        lastName: schema.members.lastName,
      })
      .from(schema.memberships)
      .innerJoin(schema.members, eq(schema.members.id, schema.memberships.memberId))
      .where(and(eq(schema.memberships.status, "ACTIVE"), lte(schema.memberships.nextDueDate, sql`current_date`)))
      .limit(8),
    Promise.resolve(null),
    db
      .select({
        id: schema.payments.id,
        amount: schema.payments.amount,
        method: schema.payments.method,
        paidAt: schema.payments.paidAt,
        firstName: schema.members.firstName,
        lastName: schema.members.lastName,
      })
      .from(schema.payments)
      .innerJoin(schema.members, eq(schema.members.id, schema.payments.memberId))
      .orderBy(sql`${schema.payments.paidAt} desc`)
      .limit(6),
    db
      .select({
        id: schema.registrations.id,
        submittedAt: schema.registrations.submittedAt,
        firstName: schema.members.firstName,
        lastName: schema.members.lastName,
      })
      .from(schema.registrations)
      .innerJoin(schema.members, eq(schema.members.id, schema.registrations.memberId))
      .where(eq(schema.registrations.status, "PENDING"))
      .orderBy(sql`${schema.registrations.submittedAt} asc`)
      .limit(6),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--dg-ink)]">Dashboard</h1>
        <p className="text-sm text-[var(--dg-slate)]">Overview for {formatDate(now)}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active members" value={String(activeMembersRow[0]?.c ?? 0)} />
        <StatCard
          label="Revenue (this month)"
          value={formatMoney(revenueMonthRow[0]?.total ?? 0)}
          tone="up"
        />
        <StatCard label="Checked in today" value={String(checkedInTodayRow[0]?.c ?? 0)} />
        <StatCard
          label="Pending registrations"
          value={String(pendingRegRow[0]?.c ?? 0)}
          sub={pendingRegRow[0]?.c ? "Needs review" : "All clear"}
          tone={pendingRegRow[0]?.c ? "down" : "neutral"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Overdue / due today"
            subtitle="Memberships needing a reminder or suspension"
            action={
              <Button href="/admin/members?due=overdue" variant="ghost" size="sm">
                View all
              </Button>
            }
          />
          <div className="divide-y divide-[var(--dg-line)]">
            {overdueMemberships.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-[var(--dg-slate)]">Nothing overdue right now.</p>
            )}
            {overdueMemberships.map((m) => {
              const bucket = classifyDueDate(m.nextDueDate ? new Date(m.nextDueDate) : null);
              return (
                <Link
                  key={m.id}
                  href={`/admin/members/${m.memberId}`}
                  className="flex items-center justify-between px-5 py-3 text-sm hover:bg-gray-50"
                >
                  <span className="font-medium text-[var(--dg-ink)]">
                    {m.firstName} {m.lastName}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-[var(--dg-slate)]">
                    Due {formatDate(m.nextDueDate)}
                    <Badge tone={bucket}>{bucket.replace("_", " ")}</Badge>
                  </span>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Pending approvals"
            subtitle="Registrations waiting on admin/manager review"
            action={
              <Button href="/admin/registrations" variant="ghost" size="sm">
                Review queue
              </Button>
            }
          />
          <div className="divide-y divide-[var(--dg-line)]">
            {pendingRegistrations.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-[var(--dg-slate)]">No pending registrations.</p>
            )}
            {pendingRegistrations.map((r) => (
              <Link
                key={r.id}
                href={`/admin/registrations/${r.id}`}
                className="flex items-center justify-between px-5 py-3 text-sm hover:bg-gray-50"
              >
                <span className="font-medium text-[var(--dg-ink)]">
                  {r.firstName} {r.lastName}
                </span>
                <span className="text-xs text-[var(--dg-slate)]">Submitted {formatDate(r.submittedAt)}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent payments" subtitle="Latest transactions recorded" />
        <div className="divide-y divide-[var(--dg-line)]">
          {recentPayments.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-[var(--dg-slate)]">No payments recorded yet.</p>
          )}
          {recentPayments.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="font-medium text-[var(--dg-ink)]">
                {p.firstName} {p.lastName}
              </span>
              <span className="text-xs text-[var(--dg-slate)]">{formatDate(p.paidAt)}</span>
              <Badge tone={p.method}>{p.method.replace("_", " ")}</Badge>
              <span className="font-semibold text-[var(--dg-ink)]">{formatMoney(p.amount)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
