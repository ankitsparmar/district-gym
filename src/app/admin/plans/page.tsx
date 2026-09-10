import { db, schema } from "@/db";
import { desc } from "drizzle-orm";
import { Card, CardHeader, Badge, Button, Input, Select, Textarea } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/business";
import { createPlan, togglePlanActive, updatePlan } from "./actions";

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
            <div key={plan.id} className="px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
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

              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-[var(--dg-slate)]">
                  Edit plan
                </summary>
                <form action={updatePlan} className="mt-3 grid gap-4 sm:grid-cols-2">
                  <input type="hidden" name="id" value={plan.id} />
                  <Input label="Name" name="name" required defaultValue={plan.name} />
                  <Select label="Type" name="type" defaultValue={plan.type}>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="ANNUAL">Annual</option>
                    <option value="PAY_PER_VISIT">Pay-per-visit</option>
                    <option value="FAMILY">Family</option>
                  </Select>
                  <Input label="Price" name="price" type="number" step="0.01" min="0" required defaultValue={plan.price} />
                  <Input
                    label="Billing interval (months)"
                    name="billingIntervalMonths"
                    type="number"
                    min="1"
                    defaultValue={plan.billingIntervalMonths}
                  />
                  <Input
                    label="Visits included (pay-per-visit)"
                    name="visitsIncluded"
                    type="number"
                    min="0"
                    defaultValue={plan.visitsIncluded ?? ""}
                  />
                  <Input
                    label="Max family members (family plan)"
                    name="familyMaxMembers"
                    type="number"
                    min="1"
                    defaultValue={plan.familyMaxMembers ?? ""}
                  />
                  <div className="sm:col-span-2">
                    <Textarea label="Description" name="description" rows={2} defaultValue={plan.description ?? ""} />
                  </div>
                  <div className="sm:col-span-2">
                    <p className="mb-2 text-xs text-[var(--dg-slate)]">
                      Changes apply to new signups immediately. They also apply to the <em>next renewal payment</em>{" "}
                      for anyone already on this plan — renewals bill at this plan&rsquo;s current price, not the price
                      a member originally signed up at. To change one member&rsquo;s own price without affecting the
                      plan, edit their membership directly from their profile instead.
                    </p>
                    <Button type="submit" size="sm" variant="outline">
                      Save changes
                    </Button>
                  </div>
                </form>
              </details>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
