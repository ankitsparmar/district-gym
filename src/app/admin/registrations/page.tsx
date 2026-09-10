import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { Card, Badge, Button, EmptyState } from "@/components/ui/primitives";
import { formatDate } from "@/lib/business";
import { bulkApproveRegistrations } from "./actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function RegistrationsQueuePage() {
  const pending = await db
    .select({
      id: schema.registrations.id,
      submittedAt: schema.registrations.submittedAt,
      firstName: schema.members.firstName,
      lastName: schema.members.lastName,
      memberCode: schema.members.memberCode,
      planName: schema.plans.name,
      referralSource: schema.members.referralSource,
      submittedByStaff: schema.registrations.submittedByStaff,
    })
    .from(schema.registrations)
    .innerJoin(schema.members, eq(schema.members.id, schema.registrations.memberId))
    .leftJoin(schema.plans, eq(schema.plans.id, schema.registrations.requestedPlanId))
    .where(eq(schema.registrations.status, "PENDING"))
    .orderBy(schema.registrations.submittedAt);

  const recent = await db
    .select({
      id: schema.registrations.id,
      status: schema.registrations.status,
      reviewedAt: schema.registrations.reviewedAt,
      firstName: schema.members.firstName,
      lastName: schema.members.lastName,
    })
    .from(schema.registrations)
    .innerJoin(schema.members, eq(schema.members.id, schema.registrations.memberId))
    .where(eq(schema.registrations.status, "APPROVED"))
    .orderBy(desc(schema.registrations.reviewedAt))
    .limit(8);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--dg-ink)]">Registrations</h1>
          <p className="text-sm text-[var(--dg-slate)]">Review and approve pending membership applications.</p>
        </div>
      </div>

      <Card>
        <form action={bulkApproveRegistrations}>
          <div className="flex items-center justify-between border-b border-[var(--dg-line)] px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--dg-ink)]">Pending queue</h3>
              <p className="mt-0.5 text-xs text-[var(--dg-slate)]">{pending.length} awaiting review</p>
            </div>
            {pending.length > 0 && (
              <Button type="submit" size="sm" variant="secondary">
                Bulk approve selected
              </Button>
            )}
          </div>
          {pending.length === 0 ? (
            <EmptyState title="Queue is empty" description="New self-registrations will appear here for review." />
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--dg-line)] text-xs uppercase tracking-wide text-[var(--dg-slate)]">
                  <th className="px-5 py-2 font-medium">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="px-2 py-2 font-medium">Applicant</th>
                  <th className="px-2 py-2 font-medium">Plan</th>
                  <th className="px-2 py-2 font-medium">Source</th>
                  <th className="px-2 py-2 font-medium">Submitted</th>
                  <th className="px-5 py-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--dg-line)]">
                {pending.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <input type="checkbox" name="ids" value={r.id} />
                    </td>
                    <td className="px-2 py-3">
                      <Link href={`/admin/registrations/${r.id}`} className="font-medium text-[var(--dg-ink)] hover:underline">
                        {r.firstName} {r.lastName}
                      </Link>
                      <p className="text-xs text-[var(--dg-slate)]">{r.memberCode}</p>
                    </td>
                    <td className="px-2 py-3">{r.planName ?? "—"}</td>
                    <td className="px-2 py-3">
                      <Badge tone="OK">{r.submittedByStaff ? "Front desk" : (r.referralSource ?? "ONLINE").replace("_", " ")}</Badge>
                    </td>
                    <td className="px-2 py-3 text-[var(--dg-slate)]">{formatDate(r.submittedAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <Button href={`/admin/registrations/${r.id}`} size="sm" variant="outline">
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </form>
      </Card>

      <Card>
        <div className="border-b border-[var(--dg-line)] px-5 py-4">
          <h3 className="text-sm font-semibold text-[var(--dg-ink)]">Recently approved</h3>
        </div>
        <div className="divide-y divide-[var(--dg-line)]">
          {recent.length === 0 && <p className="px-5 py-6 text-sm text-[var(--dg-slate)]">Nothing yet.</p>}
          {recent.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="font-medium text-[var(--dg-ink)]">
                {r.firstName} {r.lastName}
              </span>
              <span className="flex items-center gap-2 text-xs text-[var(--dg-slate)]">
                {formatDate(r.reviewedAt)}
                <Badge tone={r.status}>{r.status}</Badge>
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
