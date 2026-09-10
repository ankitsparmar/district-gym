import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { Card, CardHeader, Badge, Button, Input, Select, Textarea } from "@/components/ui/primitives";
import { formatDate, formatMoney } from "@/lib/business";
import { createTrainer, schedulePtSession, completePtSession, cancelPtSession, markCommissionPaid } from "./actions";

export const dynamic = "force-dynamic";

export default async function TrainersPage() {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  const isManagement = role === "ADMIN" || role === "MANAGER";

  const trainers = await db
    .select({
      id: schema.trainers.id,
      bio: schema.trainers.bio,
      specialties: schema.trainers.specialties,
      commissionRate: schema.trainers.commissionRate,
      active: schema.trainers.active,
      name: schema.users.name,
      email: schema.users.email,
    })
    .from(schema.trainers)
    .innerJoin(schema.users, eq(schema.users.id, schema.trainers.userId));

  const members = await db.select({ id: schema.members.id, firstName: schema.members.firstName, lastName: schema.members.lastName }).from(schema.members);

  const sessions = await db
    .select({
      id: schema.ptSessions.id,
      trainerId: schema.ptSessions.trainerId,
      scheduledAt: schema.ptSessions.scheduledAt,
      status: schema.ptSessions.status,
      price: schema.ptSessions.price,
      memberFirst: schema.members.firstName,
      memberLast: schema.members.lastName,
    })
    .from(schema.ptSessions)
    .innerJoin(schema.members, eq(schema.members.id, schema.ptSessions.memberId))
    .orderBy(desc(schema.ptSessions.scheduledAt))
    .limit(30);

  const commissions = isManagement
    ? await db
        .select({
          id: schema.commissions.id,
          trainerId: schema.commissions.trainerId,
          amount: schema.commissions.amount,
          status: schema.commissions.status,
          createdAt: schema.commissions.createdAt,
        })
        .from(schema.commissions)
        .orderBy(desc(schema.commissions.createdAt))
        .limit(30)
    : [];

  const trainerName = (id: number) => trainers.find((t) => t.id === id)?.name ?? "—";

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--dg-ink)]">Trainers</h1>
        <p className="text-sm text-[var(--dg-slate)]">Trainer roster, PT sessions, and commission payouts.</p>
      </div>

      {isManagement && (
        <Card>
          <CardHeader title="Add trainer" subtitle="Creates a staff login with the Trainer role" />
          <form action={createTrainer} className="grid gap-4 p-5 sm:grid-cols-2">
            <Input label="Full name" name="name" required />
            <Input label="Email" name="email" type="email" required />
            <Input label="Temporary password" name="password" defaultValue="changeme123" required />
            <Input label="Commission rate (%)" name="commissionRate" type="number" step="0.1" min="0" max="100" defaultValue="20" />
            <Input label="Specialties" name="specialties" placeholder="Strength, HIIT, Yoga…" />
            <div className="sm:col-span-2">
              <Textarea label="Bio" name="bio" rows={2} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Add trainer</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <CardHeader title="Roster" />
        <div className="divide-y divide-[var(--dg-line)]">
          {trainers.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <p className="font-medium text-[var(--dg-ink)]">{t.name}</p>
                <p className="text-xs text-[var(--dg-slate)]">{t.specialties || "General"} &middot; {t.commissionRate}% commission</p>
              </div>
              <Badge tone={t.active ? "ACTIVE" : "CANCELLED"}>{t.active ? "Active" : "Inactive"}</Badge>
            </div>
          ))}
          {trainers.length === 0 && <p className="px-5 py-6 text-sm text-[var(--dg-slate)]">No trainers yet.</p>}
        </div>
      </Card>

      <Card>
        <CardHeader title="Schedule a PT session" />
        <form action={schedulePtSession} className="grid gap-4 p-5 sm:grid-cols-2">
          <Select label="Trainer" name="trainerId">
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          <Select label="Member" name="memberId">
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName}
              </option>
            ))}
          </Select>
          <Input label="Date & time" name="scheduledAt" type="datetime-local" required />
          <Input label="Duration (minutes)" name="durationMinutes" type="number" defaultValue={60} />
          <Input label="Price (optional)" name="price" type="number" step="0.01" min="0" />
          <div className="sm:col-span-2">
            <Button type="submit">Schedule session</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Upcoming & recent PT sessions" />
        <div className="divide-y divide-[var(--dg-line)]">
          {sessions.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
              <span className="font-medium text-[var(--dg-ink)]">
                {s.memberFirst} {s.memberLast}
              </span>
              <span className="text-xs text-[var(--dg-slate)]">with {trainerName(s.trainerId)}</span>
              <span className="text-xs text-[var(--dg-slate)]">{formatDate(s.scheduledAt)}</span>
              {s.price && <span className="text-xs text-[var(--dg-slate)]">{formatMoney(s.price)}</span>}
              <Badge tone={s.status}>{s.status.replace("_", " ")}</Badge>
              {s.status === "SCHEDULED" && (
                <div className="flex gap-1">
                  <form action={completePtSession}>
                    <input type="hidden" name="sessionId" value={s.id} />
                    <Button type="submit" size="sm" variant="outline">
                      Complete
                    </Button>
                  </form>
                  <form action={cancelPtSession}>
                    <input type="hidden" name="sessionId" value={s.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      Cancel
                    </Button>
                  </form>
                </div>
              )}
            </div>
          ))}
          {sessions.length === 0 && <p className="px-5 py-6 text-sm text-[var(--dg-slate)]">No PT sessions yet.</p>}
        </div>
      </Card>

      {isManagement && (
        <Card>
          <CardHeader title="Commission payouts" />
          <div className="divide-y divide-[var(--dg-line)]">
            {commissions.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="font-medium text-[var(--dg-ink)]">{trainerName(c.trainerId)}</span>
                <span className="text-xs text-[var(--dg-slate)]">{formatDate(c.createdAt)}</span>
                <span className="font-semibold text-[var(--dg-ink)]">{formatMoney(c.amount)}</span>
                <Badge tone={c.status === "PAID" ? "COMPLETED" : "PENDING"}>{c.status}</Badge>
                {c.status === "PENDING" && (
                  <form action={markCommissionPaid}>
                    <input type="hidden" name="commissionId" value={c.id} />
                    <Button type="submit" size="sm" variant="outline">
                      Mark paid
                    </Button>
                  </form>
                )}
              </div>
            ))}
            {commissions.length === 0 && <p className="px-5 py-6 text-sm text-[var(--dg-slate)]">No commissions recorded.</p>}
          </div>
        </Card>
      )}
    </div>
  );
}
