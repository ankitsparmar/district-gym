import { db, schema } from "@/db";
import { desc, sum } from "drizzle-orm";
import { Card, CardHeader, Badge, Button, Input, Select } from "@/components/ui/primitives";
import { formatDate, formatMoney } from "@/lib/business";
import { createExpense } from "./actions";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const expenses = await db.select().from(schema.expenses).orderBy(desc(schema.expenses.date)).limit(100);
  const [total] = await db.select({ total: sum(schema.expenses.amount) }).from(schema.expenses);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--dg-ink)]">Expenses</h1>
          <p className="text-sm text-[var(--dg-slate)]">Rent, equipment, salaries, and other outgoings.</p>
        </div>
        <Badge tone="OK">All time: {formatMoney(total?.total ?? 0)}</Badge>
      </div>

      <Card>
        <CardHeader title="Log an expense" />
        <form action={createExpense} className="grid gap-4 p-5 sm:grid-cols-2">
          <Select label="Category" name="category" defaultValue="RENT">
            <option value="RENT">Rent</option>
            <option value="EQUIPMENT">Equipment</option>
            <option value="SALARIES">Salaries</option>
            <option value="UTILITIES">Utilities</option>
            <option value="MARKETING">Marketing</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="OTHER">Other</option>
          </Select>
          <Input label="Amount" name="amount" type="number" step="0.01" min="0" required />
          <Input label="Date" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          <Input label="Description" name="description" placeholder="e.g. Monthly lease payment" />
          <div className="sm:col-span-2">
            <Button type="submit">Log expense</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="All expenses" />
        <div className="divide-y divide-[var(--dg-line)]">
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <Badge tone="OK">{e.category}</Badge>
              <span className="flex-1 px-3 text-[var(--dg-ink)]">{e.description}</span>
              <span className="text-xs text-[var(--dg-slate)]">{formatDate(e.date)}</span>
              <span className="font-semibold text-[var(--dg-ink)]">{formatMoney(e.amount)}</span>
            </div>
          ))}
          {expenses.length === 0 && <p className="px-5 py-6 text-sm text-[var(--dg-slate)]">No expenses logged yet.</p>}
        </div>
      </Card>
    </div>
  );
}
