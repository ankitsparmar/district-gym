import { db, schema } from "@/db";
import { desc } from "drizzle-orm";
import { Card, CardHeader, Badge, Button, Input, Select, Textarea } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/business";
import { createPlan, togglePlanActive } from "./actions";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const plans = await db.select().from(schema.plans).orderBy(desc(schema.plans.active), schema.plans.price);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--dg-ink)]">Membership plans</h1>
        <p className="text-sm text-[var(--dg-slate)]">Configure tiers, pricing, and billing intervals.</p>
      </div>

      <Card>
        <CardHeader title="Create a plan" />
        <form action={createPlan} className="grid gap-4 p-5 sm:grid-cols-2">
          <Input label="Name" name="name" required placeholder="e.g. Gold Monthly" />
          <Select label="Type" name="type" defaultValue="MONTHLY">
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="ANNUAL">Annual</option>
            <option value="PAY_PER_VISIT">Pay-per-visit</option>
            <option value="FAMILY">Family</option>
          </Select>
          <Input label="Price" name="price" type="number" step="0.01" min="0" required />
          <Input label="Billing interval (months)" name="billingIntervalMonths" type="number" min="1" defaultValue={1} />
          <Input label="Visits included (pay-per-visit)" name="visitsIncluded" type="number" min="0" />
          <Input label="Max family members (family plan)" name="familyMaxMembers" type="number" min="1" />
          <div className="sm:col-span-2">
            <Textarea label="Description" name="description" rows={2} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Create plan</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="All plans" />
        <div className="divide-y divide-[var(--dg-line)]">
          {plans.map((plan) => (
            <div key={plan.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="font-medium text-[var(--dg-ink)]">{plan.name}</p>
                <p className="text-xs text-[var(--dg-slate)]">
                  {plan.type.replace("_", " ")} &middot; {formatMoney(plan.price)} every {plan.billingIntervalMonths} mo
                  {plan.description ? ` — ${plan.description}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={plan.active ? "ACTIVE" : "CANCELLED"}>{plan.active ? "Active" : "Inactive"}</Badge>
                <form action={togglePlanActive}>
                  <input type="hidden" name="id" value={plan.id} />
                  <input type="hidden" name="active" value={String(plan.active)} />
                  <Button type="submit" size="sm" variant="outline">
                    {plan.active ? "Deactivate" : "Activate"}
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
