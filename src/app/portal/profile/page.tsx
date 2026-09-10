import { requireMember } from "@/lib/rbac";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { Card, CardHeader, Button, Input, Textarea } from "@/components/ui/primitives";
import { updateMyProfile } from "./actions";
import { ChangePasswordForm } from "./change-password-form";

export const dynamic = "force-dynamic";

export default async function PortalProfilePage() {
  const { memberId } = await requireMember();
  const [member] = await db.select().from(schema.members).where(eq(schema.members.id, memberId)).limit(1);
  const goals = await db.select().from(schema.goals).where(eq(schema.goals.memberId, memberId));

  if (!member) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[var(--dg-ink)]">Your profile</h1>

      <Card>
        <CardHeader title="Contact details" />
        <form action={updateMyProfile} className="grid gap-4 p-5 sm:grid-cols-2">
          <Input label="Phone" name="phone" defaultValue={member.phone ?? ""} />
          <div />
          <div className="sm:col-span-2">
            <Textarea label="Address" name="address" defaultValue={member.address ?? ""} rows={2} />
          </div>
          <Input label="Emergency contact name" name="emergencyContactName" defaultValue={member.emergencyContactName ?? ""} />
          <Input label="Emergency contact phone" name="emergencyContactPhone" defaultValue={member.emergencyContactPhone ?? ""} />
          <div className="sm:col-span-2">
            <Button type="submit" size="sm">
              Save changes
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Goals" />
        <div className="divide-y divide-[var(--dg-line)]">
          {goals.map((g) => (
            <div key={g.id} className="px-5 py-3 text-sm">
              <p className="font-medium text-[var(--dg-ink)]">{g.goalType}</p>
              <p className="text-xs text-[var(--dg-slate)]">
                {g.currentValue ?? "—"} / {g.targetValue ?? "—"} {g.unit}
              </p>
            </div>
          ))}
          {goals.length === 0 && <p className="px-5 py-6 text-sm text-[var(--dg-slate)]">No goals set by your trainer yet.</p>}
        </div>
      </Card>

      <Card>
        <CardHeader title="Change password" />
        <div className="p-5">
          <ChangePasswordForm />
        </div>
      </Card>
    </div>
  );
}
