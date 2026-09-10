import { db, schema } from "@/db";
import { desc } from "drizzle-orm";
import { Card, CardHeader, Badge, Button, Input, Select } from "@/components/ui/primitives";
import { formatDate } from "@/lib/business";
import { createStaff, toggleStaffActive } from "./actions";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const staff = await db.select().from(schema.users).orderBy(desc(schema.users.createdAt));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--dg-ink)]">Staff</h1>
        <p className="text-sm text-[var(--dg-slate)]">Manage staff logins and roles. Admin only.</p>
      </div>

      <Card>
        <CardHeader title="Add staff member" />
        <form action={createStaff} className="grid gap-4 p-5 sm:grid-cols-2">
          <Input label="Full name" name="name" required />
          <Input label="Email" name="email" type="email" required />
          <Select label="Role" name="role" defaultValue="FRONT_DESK">
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="FRONT_DESK">Front desk</option>
            <option value="TRAINER">Trainer</option>
          </Select>
          <Input label="Temporary password" name="password" defaultValue="changeme123" required />
          <div className="sm:col-span-2">
            <Button type="submit">Add staff member</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="All staff" />
        <div className="divide-y divide-[var(--dg-line)]">
          {staff.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <p className="font-medium text-[var(--dg-ink)]">{s.name}</p>
                <p className="text-xs text-[var(--dg-slate)]">
                  {s.email} &middot; Joined {formatDate(s.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone="OK">{s.role.replace("_", " ")}</Badge>
                <Badge tone={s.active ? "ACTIVE" : "SUSPENDED"}>{s.active ? "Active" : "Disabled"}</Badge>
                <form action={toggleStaffActive}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="active" value={String(s.active)} />
                  <Button type="submit" size="sm" variant="outline">
                    {s.active ? "Disable" : "Enable"}
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
