import { db, schema } from "@/db";
import { asc, desc, eq, gte } from "drizzle-orm";
import { Card, CardHeader, Badge, Button, Input, Select } from "@/components/ui/primitives";
import { formatDate } from "@/lib/business";
import { createClass, scheduleClass, bookClassForMember, cancelBooking, markAttended } from "./actions";

export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const classes = await db
    .select({
      id: schema.classes.id,
      name: schema.classes.name,
      capacity: schema.classes.capacity,
      durationMinutes: schema.classes.durationMinutes,
      trainerId: schema.classes.trainerId,
      trainerName: schema.users.name,
    })
    .from(schema.classes)
    .leftJoin(schema.trainers, eq(schema.trainers.id, schema.classes.trainerId))
    .leftJoin(schema.users, eq(schema.users.id, schema.trainers.userId));

  const trainers = await db
    .select({ id: schema.trainers.id, name: schema.users.name })
    .from(schema.trainers)
    .innerJoin(schema.users, eq(schema.users.id, schema.trainers.userId));

  const members = await db.select({ id: schema.members.id, firstName: schema.members.firstName, lastName: schema.members.lastName }).from(schema.members);

  const upcoming = await db
    .select({
      id: schema.classSchedules.id,
      startsAt: schema.classSchedules.startsAt,
      className: schema.classes.name,
    })
    .from(schema.classSchedules)
    .innerJoin(schema.classes, eq(schema.classes.id, schema.classSchedules.classId))
    .where(gte(schema.classSchedules.startsAt, new Date()))
    .orderBy(asc(schema.classSchedules.startsAt))
    .limit(20);

  const bookingsBySchedule = new Map<number, { id: number; status: string; firstName: string; lastName: string }[]>();
  if (upcoming.length) {
    const rows = await db
      .select({
        id: schema.classBookings.id,
        classScheduleId: schema.classBookings.classScheduleId,
        status: schema.classBookings.status,
        firstName: schema.members.firstName,
        lastName: schema.members.lastName,
      })
      .from(schema.classBookings)
      .innerJoin(schema.members, eq(schema.members.id, schema.classBookings.memberId));
    for (const r of rows) {
      const list = bookingsBySchedule.get(r.classScheduleId) ?? [];
      list.push(r);
      bookingsBySchedule.set(r.classScheduleId, list);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--dg-ink)]">Classes</h1>
        <p className="text-sm text-[var(--dg-slate)]">Group classes, schedules, and bookings.</p>
      </div>

      <Card>
        <CardHeader title="Create a class" />
        <form action={createClass} className="grid gap-4 p-5 sm:grid-cols-2">
          <Input label="Class name" name="name" required placeholder="e.g. HIIT Circuit" />
          <Select label="Trainer (optional)" name="trainerId" defaultValue="">
            <option value="">Unassigned</option>
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          <Input label="Capacity" name="capacity" type="number" defaultValue={20} />
          <Input label="Duration (minutes)" name="durationMinutes" type="number" defaultValue={45} />
          <div className="sm:col-span-2">
            <Button type="submit">Create class</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Schedule a session" />
        <form action={scheduleClass} className="grid gap-4 p-5 sm:grid-cols-2">
          <Select label="Class" name="classId">
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input label="Starts at" name="startsAt" type="datetime-local" required />
          <Input label="Duration (minutes)" name="durationMinutes" type="number" defaultValue={45} />
          <div className="sm:col-span-2">
            <Button type="submit">Schedule</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Upcoming sessions" />
        <div className="divide-y divide-[var(--dg-line)]">
          {upcoming.map((s) => {
            const bookings = bookingsBySchedule.get(s.id) ?? [];
            return (
              <div key={s.id} className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--dg-ink)]">{s.className}</p>
                  <p className="text-xs text-[var(--dg-slate)]">{formatDate(s.startsAt)}</p>
                </div>
                <form action={bookClassForMember} className="mt-2 flex gap-2">
                  <input type="hidden" name="classScheduleId" value={s.id} />
                  <select name="memberId" className="flex-1 rounded-lg border border-[var(--dg-line)] px-2 py-1 text-xs">
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.firstName} {m.lastName}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" size="sm" variant="outline">
                    Book
                  </Button>
                </form>
                <div className="mt-2 flex flex-wrap gap-2">
                  {bookings.map((b) => (
                    <span key={b.id} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs">
                      {b.firstName} {b.lastName}
                      <Badge tone={b.status}>{b.status}</Badge>
                      {b.status === "BOOKED" && (
                        <>
                          <form action={markAttended}>
                            <input type="hidden" name="bookingId" value={b.id} />
                            <button className="text-emerald-600" title="Mark attended">
                              ✓
                            </button>
                          </form>
                          <form action={cancelBooking}>
                            <input type="hidden" name="bookingId" value={b.id} />
                            <button className="text-red-600" title="Cancel">
                              ×
                            </button>
                          </form>
                        </>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
          {upcoming.length === 0 && <p className="px-5 py-6 text-sm text-[var(--dg-slate)]">No upcoming sessions scheduled.</p>}
        </div>
      </Card>
    </div>
  );
}
