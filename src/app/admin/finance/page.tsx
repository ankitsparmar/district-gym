import { db, schema } from "@/db";
import { and, desc, eq, gte, lte, sql, sum } from "drizzle-orm";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardHeader, StatCard, Badge, Button } from "@/components/ui/primitives";
import { formatDate, formatMoney } from "@/lib/business";
import { RevenueChart, PaymentMethodChart } from "./charts";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  if (role !== "ADMIN" && role !== "MANAGER") redirect("/admin");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [monthRevenue, yearRevenue, allTimeRevenue, methodBreakdown, revenueByPlan, monthlySeries, expensesMonth] =
    await Promise.all([
      db
        .select({ total: sum(schema.payments.amount) })
        .from(schema.payments)
        .where(and(gte(schema.payments.paidAt, monthStart), eq(schema.payments.status, "COMPLETED"))),
      db
        .select({ total: sum(schema.payments.amount) })
        .from(schema.payments)
        .where(and(gte(schema.payments.paidAt, yearStart), eq(schema.payments.status, "COMPLETED"))),
      db.select({ total: sum(schema.payments.amount) }).from(schema.payments).where(eq(schema.payments.status, "COMPLETED")),
      db
        .select({ method: schema.payments.method, total: sum(schema.payments.amount) })
        .from(schema.payments)
        .where(eq(schema.payments.status, "COMPLETED"))
        .groupBy(schema.payments.method),
      db
        .select({ planName: schema.plans.name, total: sum(schema.payments.amount) })
        .from(schema.payments)
        .innerJoin(schema.memberships, eq(schema.memberships.id, schema.payments.membershipId))
        .innerJoin(schema.plans, eq(schema.plans.id, schema.memberships.planId))
        .where(eq(schema.payments.status, "COMPLETED"))
        .groupBy(schema.plans.name),
      db
        .select({
          month: sql<string>`to_char(${schema.payments.paidAt}, 'YYYY-MM')`,
          total: sum(schema.payments.amount),
        })
        .from(schema.payments)
        .where(and(gte(schema.payments.paidAt, twelveMonthsAgo), eq(schema.payments.status, "COMPLETED")))
        .groupBy(sql`to_char(${schema.payments.paidAt}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${schema.payments.paidAt}, 'YYYY-MM')`),
      db
        .select({ total: sum(schema.expenses.amount) })
        .from(schema.expenses)
        .where(gte(schema.expenses.date, monthStart.toISOString().slice(0, 10))),
    ]);

  const outstanding = await db
    .select({
      membershipId: schema.memberships.id,
      memberId: schema.memberships.memberId,
      firstName: schema.members.firstName,
      lastName: schema.members.lastName,
      nextDueDate: schema.memberships.nextDueDate,
      priceAtSignup: schema.memberships.priceAtSignup,
    })
    .from(schema.memberships)
    .innerJoin(schema.members, eq(schema.members.id, schema.memberships.memberId))
    .where(and(lte(schema.memberships.nextDueDate, sql`current_date`), eq(schema.memberships.status, "ACTIVE")))
    .orderBy(schema.memberships.nextDueDate)
    .limit(25);

  const refunds = await db
    .select({
      id: schema.refunds.id,
      amount: schema.refunds.amount,
      reason: schema.refunds.reason,
      processedAt: schema.refunds.processedAt,
      firstName: schema.members.firstName,
      lastName: schema.members.lastName,
    })
    .from(schema.refunds)
    .innerJoin(schema.payments, eq(schema.payments.id, schema.refunds.paymentId))
    .innerJoin(schema.members, eq(schema.members.id, schema.payments.memberId))
    .orderBy(desc(schema.refunds.processedAt))
    .limit(15);

  const cancelledMemberships = await db
    .select({
      id: schema.memberships.id,
      memberId: schema.memberships.memberId,
      firstName: schema.members.firstName,
      lastName: schema.members.lastName,
      endDate: schema.memberships.endDate,
    })
    .from(schema.memberships)
    .innerJoin(schema.members, eq(schema.members.id, schema.memberships.memberId))
    .where(eq(schema.memberships.status, "CANCELLED"))
    .limit(15);

  const totalExpenseMonth = Number(expensesMonth[0]?.total ?? 0);
  const totalRevenueMonth = Number(monthRevenue[0]?.total ?? 0);
  const netMonth = totalRevenueMonth - totalExpenseMonth;

  const chartData = monthlySeries.map((m) => ({ month: m.month, total: Number(m.total ?? 0) }));
  const methodData = methodBreakdown.map((m) => ({ method: m.method, total: Number(m.total ?? 0) }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--dg-ink)]">Finance</h1>
          <p className="text-sm text-[var(--dg-slate)]">Revenue, dues, refunds, and P&amp;L overview.</p>
        </div>
        <div className="flex gap-2">
          <Button href="/admin/finance/invoices" variant="ghost" size="sm">
            All invoices
          </Button>
          <Button href="/api/export/payments" variant="outline" size="sm">
            Export payments (Excel)
          </Button>
          <Button href="/api/export/finance-summary" variant="outline" size="sm">
            Export summary (PDF)
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue (this month)" value={formatMoney(totalRevenueMonth)} />
        <StatCard label="Revenue (this year)" value={formatMoney(yearRevenue[0]?.total ?? 0)} />
        <StatCard label="Revenue (all time)" value={formatMoney(allTimeRevenue[0]?.total ?? 0)} />
        <StatCard
          label="Net (this month)"
          value={formatMoney(netMonth)}
          sub={`Expenses: ${formatMoney(totalExpenseMonth)}`}
          tone={netMonth >= 0 ? "up" : "down"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-[var(--dg-ink)]">Revenue — last 12 months</h3>
          <RevenueChart data={chartData} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-[var(--dg-ink)]">Payment method breakdown</h3>
          <PaymentMethodChart data={methodData} />
        </Card>
      </div>

      <Card>
        <CardHeader title="Revenue by plan" />
        <div className="divide-y divide-[var(--dg-line)]">
          {revenueByPlan.map((r) => (
            <div key={r.planName} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="font-medium text-[var(--dg-ink)]">{r.planName}</span>
              <span className="font-semibold text-[var(--dg-ink)]">{formatMoney(r.total ?? 0)}</span>
            </div>
          ))}
          {revenueByPlan.length === 0 && <p className="px-5 py-6 text-sm text-[var(--dg-slate)]">No revenue recorded yet.</p>}
        </div>
      </Card>

      <Card>
        <CardHeader title="Outstanding & overdue dues" subtitle={`${outstanding.length} membership(s) due or overdue`} />
        <div className="divide-y divide-[var(--dg-line)]">
          {outstanding.map((o) => (
            <a
              key={o.membershipId}
              href={`/admin/members/${o.memberId}`}
              className="flex items-center justify-between px-5 py-3 text-sm hover:bg-gray-50"
            >
              <span className="font-medium text-[var(--dg-ink)]">
                {o.firstName} {o.lastName}
              </span>
              <span className="text-xs text-[var(--dg-slate)]">Due {formatDate(o.nextDueDate)}</span>
              <span className="font-semibold text-[var(--dg-ink)]">{formatMoney(o.priceAtSignup)}</span>
            </a>
          ))}
          {outstanding.length === 0 && <p className="px-5 py-6 text-sm text-[var(--dg-slate)]">No outstanding dues. 🎉</p>}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Refunds" />
          <div className="divide-y divide-[var(--dg-line)]">
            {refunds.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="text-[var(--dg-ink)]">
                  {r.firstName} {r.lastName}
                </span>
                <span className="text-xs text-[var(--dg-slate)]">{formatDate(r.processedAt)}</span>
                <span className="font-semibold text-red-600">-{formatMoney(r.amount)}</span>
              </div>
            ))}
            {refunds.length === 0 && <p className="px-5 py-6 text-sm text-[var(--dg-slate)]">No refunds issued.</p>}
          </div>
        </Card>
        <Card>
          <CardHeader title="Cancellations" />
          <div className="divide-y divide-[var(--dg-line)]">
            {cancelledMemberships.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="text-[var(--dg-ink)]">
                  {c.firstName} {c.lastName}
                </span>
                <Badge tone="CANCELLED">{formatDate(c.endDate)}</Badge>
              </div>
            ))}
            {cancelledMemberships.length === 0 && <p className="px-5 py-6 text-sm text-[var(--dg-slate)]">No cancellations.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
