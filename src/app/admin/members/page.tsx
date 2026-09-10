import { db, schema } from "@/db";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { auth } from "@/auth";
import { Card, Badge, Button, Input, EmptyState } from "@/components/ui/primitives";
import { formatDate, classifyDueDate } from "@/lib/business";
import { SmsReminderButton } from "./sms-reminder-button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MembersListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim();
  const status = sp.status;

  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  const canMessageMembers = role === "ADMIN" || role === "MANAGER" || role === "FRONT_DESK";

  const conditions = [];
  if (q) {
    conditions.push(
      or(
        ilike(schema.members.firstName, `%${q}%`),
        ilike(schema.members.lastName, `%${q}%`),
        ilike(schema.members.email, `%${q}%`),
        ilike(schema.members.memberCode, `%${q}%`)
      )
    );
  }
  if (status) {
    conditions.push(eq(schema.members.status, status as any));
  }

  const members = await db
    .select({
      id: schema.members.id,
      firstName: schema.members.firstName,
      lastName: schema.members.lastName,
      memberCode: schema.members.memberCode,
      email: schema.members.email,
      phone: schema.members.phone,
      status: schema.members.status,
      createdAt: schema.members.createdAt,
    })
    .from(schema.members)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.members.createdAt))
    .limit(150);

  // Attach current membership + due bucket
  const memberIds = members.map((m) => m.id);
  const memberships = memberIds.length
    ? await db.select().from(schema.memberships).where(inArray(schema.memberships.memberId, memberIds))
    : [];

  const latestMembershipByMember = new Map<number, (typeof memberships)[number]>();
  for (const m of memberships) {
    const existing = latestMembershipByMember.get(m.memberId);
    if (!existing || new Date(m.createdAt) > new Date(existing.createdAt)) {
      latestMembershipByMember.set(m.memberId, m);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--dg-ink)]">Members</h1>
          <p className="text-sm text-[var(--dg-slate)]">{members.length} shown</p>
        </div>
        <Button href="/admin/registrations">+ New registration</Button>
      </div>

      <Card className="p-4">
        <form className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Input label="Search" name="q" defaultValue={q} placeholder="Name, email, member code…" />
          </div>
          <div className="w-48">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-[var(--dg-ink)]">Status</span>
              <select name="status" defaultValue={status ?? ""} className="w-full rounded-lg border border-[var(--dg-line)] px-3 py-2 text-sm">
                <option value="">All</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="FROZEN">Frozen</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </label>
          </div>
          <Button type="submit" variant="outline">
            Filter
          </Button>
        </form>
      </Card>

      <Card>
        {members.length === 0 ? (
          <EmptyState title="No members found" description="Try adjusting your search or filters." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--dg-line)] text-xs uppercase tracking-wide text-[var(--dg-slate)]">
                <th className="px-5 py-2 font-medium">Member</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Next due</th>
                <th className="px-2 py-2 font-medium">Joined</th>
                {canMessageMembers && <th className="px-2 py-2 font-medium">Payment reminder</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--dg-line)]">
              {members.map((m) => {
                const membership = latestMembershipByMember.get(m.id);
                const bucket = membership ? classifyDueDate(membership.nextDueDate ? new Date(membership.nextDueDate) : null) : "OK";
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <Link href={`/admin/members/${m.id}`} className="font-medium text-[var(--dg-ink)] hover:underline">
                        {m.firstName} {m.lastName}
                      </Link>
                      <p className="text-xs text-[var(--dg-slate)]">
                        {m.memberCode} &middot; {m.email}
                      </p>
                    </td>
                    <td className="px-2 py-3">
                      <Badge tone={m.status}>{m.status}</Badge>
                    </td>
                    <td className="px-2 py-3">
                      {membership?.nextDueDate ? (
                        <span className="flex items-center gap-2">
                          {formatDate(membership.nextDueDate)}
                          {bucket !== "OK" && <Badge tone={bucket}>{bucket.replace("_", " ")}</Badge>}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-2 py-3 text-[var(--dg-slate)]">{formatDate(m.createdAt)}</td>
                    {canMessageMembers && (
                      <td className="px-2 py-3">
                        <SmsReminderButton
                          memberId={m.id}
                          disabled={!m.phone}
                          disabledReason={!m.phone ? "No phone number on file" : undefined}
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
