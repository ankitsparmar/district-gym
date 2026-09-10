import { requireMember } from "@/lib/rbac";
import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { Card, Badge, Button } from "@/components/ui/primitives";
import { formatDate, formatMoney } from "@/lib/business";

export const dynamic = "force-dynamic";

export default async function PortalPaymentsPage() {
  const { memberId } = await requireMember();
  const payments = await db.select().from(schema.payments).where(eq(schema.payments.memberId, memberId)).orderBy(desc(schema.payments.paidAt));
  const invoices = await db.select().from(schema.invoices).where(eq(schema.invoices.memberId, memberId)).orderBy(desc(schema.invoices.issueDate));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[var(--dg-ink)]">Payments</h1>

      <Card>
        <div className="border-b border-[var(--dg-line)] px-5 py-4">
          <h3 className="text-sm font-semibold text-[var(--dg-ink)]">Payment history</h3>
        </div>
        <div className="divide-y divide-[var(--dg-line)]">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="text-[var(--dg-slate)]">{formatDate(p.paidAt)}</span>
              <Badge tone={p.method}>{p.method.replace("_", " ")}</Badge>
              <Badge tone={p.status}>{p.status}</Badge>
              <span className="font-semibold text-[var(--dg-ink)]">{formatMoney(p.amount)}</span>
            </div>
          ))}
          {payments.length === 0 && <p className="px-5 py-6 text-sm text-[var(--dg-slate)]">No payments yet.</p>}
        </div>
      </Card>

      <Card>
        <div className="border-b border-[var(--dg-line)] px-5 py-4">
          <h3 className="text-sm font-semibold text-[var(--dg-ink)]">Invoices</h3>
        </div>
        <div className="divide-y divide-[var(--dg-line)]">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="font-medium text-[var(--dg-ink)]">{inv.invoiceNumber}</span>
              <span className="text-xs text-[var(--dg-slate)]">{formatDate(inv.issueDate)}</span>
              <Badge tone={inv.status}>{inv.status}</Badge>
              <span className="font-semibold text-[var(--dg-ink)]">{formatMoney(inv.total)}</span>
              <Button href={`/api/invoices/${inv.id}/pdf`} size="sm" variant="outline">
                PDF
              </Button>
            </div>
          ))}
          {invoices.length === 0 && <p className="px-5 py-6 text-sm text-[var(--dg-slate)]">No invoices yet.</p>}
        </div>
      </Card>
    </div>
  );
}
