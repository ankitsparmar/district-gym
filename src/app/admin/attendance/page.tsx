import { db, schema } from "@/db";
import { desc, eq, gte } from "drizzle-orm";
import { Card, CardHeader, Badge } from "@/components/ui/primitives";
import { formatDate } from "@/lib/business";
import { CheckInForm } from "./checkin-form";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayLog = await db
    .select({
      id: schema.attendance.id,
      checkInAt: schema.attendance.checkInAt,
      method: schema.attendance.method,
      firstName: schema.members.firstName,
      lastName: schema.members.lastName,
      memberCode: schema.members.memberCode,
    })
    .from(schema.attendance)
    .innerJoin(schema.members, eq(schema.members.id, schema.attendance.memberId))
    .where(gte(schema.attendance.checkInAt, todayStart))
    .orderBy(desc(schema.attendance.checkInAt));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--dg-ink)]">Attendance</h1>
        <p className="text-sm text-[var(--dg-slate)]">Check members in by QR code / member code, RFID, or manually.</p>
      </div>

      <Card>
        <CardHeader title="Check-in kiosk" subtitle="Scanning a QR code types the member code here, then submits" />
        <div className="p-5">
          <CheckInForm />
        </div>
      </Card>

      <Card>
        <CardHeader title={`Today's check-ins (${todayLog.length})`} />
        <div className="divide-y divide-[var(--dg-line)]">
          {todayLog.length === 0 && <p className="px-5 py-8 text-center text-sm text-[var(--dg-slate)]">No check-ins yet today.</p>}
          {todayLog.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="font-medium text-[var(--dg-ink)]">
                {a.firstName} {a.lastName}
              </span>
              <span className="text-xs text-[var(--dg-slate)]">{a.memberCode}</span>
              <Badge tone="OK">{a.method}</Badge>
              <span className="text-xs text-[var(--dg-slate)]">{formatDate(a.checkInAt)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
