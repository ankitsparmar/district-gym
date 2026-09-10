import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { Card, Badge, Button } from "@/components/ui/primitives";
import { formatDate, formatMoney } from "@/lib/business";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const invoices = await db
    .select({
      id: schema.invoices.id,
      invoiceNumber: schema.invoices.invoiceNumber,
      total: schema.invoices.total,
      status: schema.invoices.status,
      issueDate: schema.invoices.issueDate,
      firstName: schema.members.firstName,
      lastName: schema.members.lastName,
    })
    .from(schema.invoices)
    .innerJoin(schema.members, eq(schema.members.id, schema.invoices.memberId))
    .orderBy(desc(schema.invoices.issueDate))
    .limit(100);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--dg-ink)]">Invoices</h1>
        <p className="text-sm text-[var(--dg-slate)]">Every invoice generated per transaction.</p>
      </div>
      <Card>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--dg-line)] text-xs uppercase tracking-wide text-[var(--dg-slate)]">
              <th className="px-5 py-2 font-medium">Invoice</th>
              <th className="px-2 py-2 font-medium">Member</th>
              <th className="px-2 py-2 font-medium">Date</th>
              <th className="px-2 py-2 font-medium">Status</th>
              <th className="px-2 py-2 font-medium">Total</th>
              <th className="px-5 py-2 font-medium text-right">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--dg-line)]">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-[var(--dg-ink)]">{inv.invoiceNumber}</td>
                <td className="px-2 py-3">
                  {inv.firstName} {inv.lastName}
                </td>
                <td className="px-2 py-3 text-[var(--dg-slate)]">{formatDate(inv.issueDate)}</td>
                <td className="px-2 py-3">
                  <Badge tone={inv.status}>{inv.status}</Badge>
                </td>
                <td className="px-2 py-3 font-semibold text-[var(--dg-ink)]">{formatMoney(inv.total)}</td>
                <td className="px-5 py-3 text-right">
                  <Button href={`/api/invoices/${inv.id}/pdf`} size="sm" variant="outline">
                    View / print
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices.length === 0 && <p className="px-5 py-8 text-center text-sm text-[var(--dg-slate)]">No invoices yet.</p>}
      </Card>
    </div>
  );
}
