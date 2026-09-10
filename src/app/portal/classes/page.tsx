import { requireMember } from "@/lib/rbac";
import { db, schema } from "@/db";
import { and, asc, eq, gte } from "drizzle-orm";
import { Card, CardHeader, Badge, Button } from "@/components/ui/primitives";
import { formatDate } from "@/lib/business";
import { bookClass, cancelMyBooking } from "./actions";

export const dynamic = "force-dynamic";

export default async function PortalClassesPage() {
  const { memberId } = await requireMember();

  const upcoming = await db
    .select({
      id: schema.classSchedules.id,
      startsAt: schema.classSchedules.startsAt,
      className: schema.classes.name,
      capacity: schema.classes.capacity,
    })
    .from(schema.classSchedules)
    .innerJoin(schema.classes, eq(schema.classes.id, schema.classSchedules.classId))
    .where(gte(schema.classSchedules.startsAt, new Date()))
    .orderBy(asc(schema.classSchedules.startsAt))
    .limit(20);

  const myBookings = await db
    .select()
    .from(schema.classBookings)
    .where(and(eq(schema.classBookings.memberId, memberId), eq(schema.classBookings.status, "BOOKED")));

  const bookedScheduleIds = new Set(myBookings.map((b) => b.classScheduleId));
  const bookingIdBySchedule = new Map(myBookings.map((b) => [b.classScheduleId, b.id]));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[var(--dg-ink)]">Classes</h1>
      <Card>
        <CardHeader title="Upcoming sessions" />
        <div className="divide-y divide-[var(--dg-line)]">
          {upcoming.map((s) => {
            const isBooked = bookedScheduleIds.has(s.id);
            return (
              <div key={s.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="font-medium text-[var(--dg-ink)]">{s.className}</p>
                  <p className="text-xs text-[var(--dg-slate)]">{formatDate(s.startsAt)}</p>
                </div>
                {isBooked ? (
                  <form action={cancelMyBooking} className="flex items-center gap-2">
                    <input type="hidden" name="bookingId" value={bookingIdBySchedule.get(s.id)} />
                    <Badge tone="BOOKED">Booked</Badge>
                    <Button type="submit" size="sm" variant="ghost">
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <form action={bookClass}>
                    <input type="hidden" name="classScheduleId" value={s.id} />
                    <Button type="submit" size="sm" variant="outline">
                      Book
                    </Button>
                  </form>
                )}
              </div>
            );
          })}
          {upcoming.length === 0 && <p className="px-5 py-8 text-center text-sm text-[var(--dg-slate)]">No upcoming classes scheduled.</p>}
        </div>
      </Card>
    </div>
  );
}
