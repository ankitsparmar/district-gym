import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { Card, CardHeader, Badge, Button, Input, Select, Textarea } from "@/components/ui/primitives";
import { formatDate, formatMoney, classifyDueDate } from "@/lib/business";
import { initials } from "@/lib/utils";
import QRCode from "qrcode";
import {
  addTag,
  removeTag,
  freezeMembership,
  unfreezeMembership,
  changePlan,
  recordRenewalPayment,
  recordAdHocPayment,
  issueRefund,
  suspendMember,
  reactivateMember,
  addCommunication,
  addGoal,
  updateGoalProgress,
  manualCheckIn,
  updateContactInfo,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memberId = Number(id);

  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  const canManageFinance = role === "ADMIN" || role === "MANAGER";

  const [member] = await db.select().from(schema.members).where(eq(schema.members.id, memberId)).limit(1);
  if (!member) notFound();

  const [memberships, allPlans, tags, payments, attendanceLog, communications, goals, documents] = await Promise.all([
    db
      .select()
      .from(schema.memberships)
      .where(eq(schema.memberships.memberId, memberId))
      .orderBy(desc(schema.memberships.createdAt)),
    db.select().from(schema.plans).where(eq(schema.plans.active, true)),
    db.select().from(schema.memberTags).where(eq(schema.memberTags.memberId, memberId)),
    db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.memberId, memberId))
      .orderBy(desc(schema.payments.paidAt)),
    db
      .select()
      .from(schema.attendance)
      .where(eq(schema.attendance.memberId, memberId))
      .orderBy(desc(schema.attendance.checkInAt))
      .limit(15),
    db
      .select()
      .from(schema.communications)
      .where(eq(schema.communications.memberId, memberId))
      .orderBy(desc(schema.communications.createdAt))
      .limit(20),
    db.select().from(schema.goals).where(eq(schema.goals.memberId, memberId)),
    db.select().from(schema.documents).where(eq(schema.documents.memberId, memberId)),
  ]);

  const membership = memberships[0];
  const currentPlan = membership ? (await db.select().from(schema.plans).where(eq(schema.plans.id, membership.planId)).limit(1))[0] : undefined;
  const membershipChanges = membership
    ? await db
        .select()
        .from(schema.membershipChanges)
        .where(eq(schema.membershipChanges.membershipId, membership.id))
        .orderBy(desc(schema.membershipChanges.changeDate))
    : [];

  const dueBucket = membership ? classifyDueDate(membership.nextDueDate ? new Date(membership.nextDueDate) : null) : "OK";
  const qrDataUrl = await QRCode.toDataURL(member.memberCode, { margin: 1, width: 128 });

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {member.photoUrl ? (
              <img src={member.photoUrl} alt="" className="h-16 w-16 rounded-full object-cover ring-1 ring-[var(--dg-line)]" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--dg-accent)] text-lg font-semibold text-white">
                {initials(`${member.firstName} ${member.lastName}`)}
              </div>
            )}
            <div>
              <h1 className="text-xl font-semibold text-[var(--dg-ink)]">
                {member.firstName} {member.lastName}
              </h1>
              <p className="text-sm text-[var(--dg-slate)]">{member.memberCode}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge tone={member.status}>{member.status}</Badge>
                {tags.map((t) => (
                  <form key={t.id} action={removeTag}>
                    <input type="hidden" name="memberId" value={memberId} />
                    <input type="hidden" name="tagId" value={t.id} />
                    <button
                      type="submit"
                      title="Remove tag"
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-[var(--dg-slate)] hover:bg-red-50 hover:text-red-600"
                    >
                      {t.tag} ×
                    </button>
                  </form>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <img src={qrDataUrl} alt="Check-in QR code" className="h-16 w-16 rounded-lg ring-1 ring-[var(--dg-line)]" />
            <form action={manualCheckIn}>
              <input type="hidden" name="memberId" value={memberId} />
              <Button type="submit" size="sm" variant="outline">
                Check in
              </Button>
            </form>
            {member.status === "SUSPENDED" ? (
              <form action={reactivateMember}>
                <input type="hidden" name="memberId" value={memberId} />
                {membership && <input type="hidden" name="membershipId" value={membership.id} />}
                <Button type="submit" size="sm" variant="secondary">
                  Reactivate
                </Button>
              </form>
            ) : (
              <form action={suspendMember}>
                <input type="hidden" name="memberId" value={memberId} />
                {membership && <input type="hidden" name="membershipId" value={membership.id} />}
                <Button type="submit" size="sm" variant="danger">
                  Suspend
                </Button>
              </form>
            )}
          </div>
        </div>
        <form action={addTag} className="mt-4 flex max-w-xs gap-2">
          <input type="hidden" name="memberId" value={memberId} />
          <Input name="tag" placeholder="Add tag e.g. VIP, at-risk" className="text-xs" />
          <Button type="submit" size="sm" variant="ghost">
            Add
          </Button>
        </form>
      </Card>

      {/* Contact info */}
      <Card>
        <CardHeader title="Contact & emergency info" />
        <form action={updateContactInfo} className="grid gap-4 p-5 sm:grid-cols-2">
          <input type="hidden" name="memberId" value={memberId} />
          <Input label="Email" name="email" type="email" defaultValue={member.email ?? ""} />
          <Input label="Phone" name="phone" defaultValue={member.phone ?? ""} />
          <div className="sm:col-span-2">
            <Textarea label="Address" name="address" defaultValue={member.address ?? ""} rows={2} />
          </div>
          <Input label="Emergency contact name" name="emergencyContactName" defaultValue={member.emergencyContactName ?? ""} />
          <Input label="Emergency contact phone" name="emergencyContactPhone" defaultValue={member.emergencyContactPhone ?? ""} />
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" variant="outline">
              Save changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Membership */}
      <Card>
        <CardHeader
          title="Membership"
          subtitle={currentPlan ? `${currentPlan.name} — ${formatMoney(currentPlan.price)}` : "No active membership"}
          action={membership && <Badge tone={membership.status}>{membership.status}</Badge>}
        />
        {membership ? (
          <div className="space-y-5 p-5">
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-[var(--dg-slate)]">Start date</dt>
                <dd className="font-medium text-[var(--dg-ink)]">{formatDate(membership.startDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--dg-slate)]">Next due</dt>
                <dd className="flex items-center gap-2 font-medium text-[var(--dg-ink)]">
                  {formatDate(membership.nextDueDate)}
                  {membership.nextDueDate && dueBucket !== "OK" && <Badge tone={dueBucket}>{dueBucket.replace("_", " ")}</Badge>}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--dg-slate)]">Auto-renew</dt>
                <dd className="font-medium text-[var(--dg-ink)]">{membership.autoRenew ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--dg-slate)]">Visits remaining</dt>
                <dd className="font-medium text-[var(--dg-ink)]">{membership.visitsRemaining ?? "—"}</dd>
              </div>
            </dl>

            <div className="grid gap-4 border-t border-[var(--dg-line)] pt-4 sm:grid-cols-3">
              {/* Freeze / unfreeze */}
              {membership.status === "FROZEN" ? (
                <form action={unfreezeMembership} className="space-y-2">
                  <input type="hidden" name="membershipId" value={membership.id} />
                  <input type="hidden" name="memberId" value={memberId} />
                  <p className="text-xs font-medium text-[var(--dg-slate)]">Membership is frozen</p>
                  <Button type="submit" size="sm" variant="outline" className="w-full justify-center">
                    Unfreeze now
                  </Button>
                </form>
              ) : (
                <form action={freezeMembership} className="space-y-2">
                  <input type="hidden" name="membershipId" value={membership.id} />
                  <input type="hidden" name="memberId" value={memberId} />
                  <p className="text-xs font-medium text-[var(--dg-slate)]">Freeze membership</p>
                  <Input name="startDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
                  <Input name="endDate" type="date" placeholder="End (optional)" />
                  <Input name="reason" placeholder="Reason (holiday, injury…)" />
                  <Button type="submit" size="sm" variant="outline" className="w-full justify-center">
                    Freeze
                  </Button>
                </form>
              )}

              {/* Upgrade / downgrade */}
              <form action={changePlan} className="space-y-2">
                <input type="hidden" name="membershipId" value={membership.id} />
                <input type="hidden" name="memberId" value={memberId} />
                <p className="text-xs font-medium text-[var(--dg-slate)]">Change plan (prorated)</p>
                <Select name="newPlanId" defaultValue={membership.planId}>
                  {allPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatMoney(p.price)}
                    </option>
                  ))}
                </Select>
                <Button type="submit" size="sm" variant="outline" className="w-full justify-center">
                  Apply change
                </Button>
              </form>

              {/* Renewal payment */}
              {canManageFinance && (
                <form action={recordRenewalPayment} className="space-y-2">
                  <input type="hidden" name="membershipId" value={membership.id} />
                  <input type="hidden" name="memberId" value={memberId} />
                  <p className="text-xs font-medium text-[var(--dg-slate)]">Record renewal payment</p>
                  <Select name="method" defaultValue="CASH">
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="OTHER">Other</option>
                  </Select>
                  <Input name="reference" placeholder="Reference (optional)" />
                  <Button type="submit" size="sm" className="w-full justify-center">
                    Record {currentPlan ? formatMoney(currentPlan.price) : "payment"}
                  </Button>
                </form>
              )}
            </div>

            {membershipChanges.length > 0 && (
              <div className="border-t border-[var(--dg-line)] pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--dg-slate)]">Renewal / change history</p>
                <div className="space-y-2">
                  {membershipChanges.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-xs">
                      <span className="text-[var(--dg-ink)]">{c.reason}</span>
                      <span className="text-[var(--dg-slate)]">{formatDate(c.changeDate)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-[var(--dg-slate)]">
            No membership yet — approve a registration to activate one.
          </p>
        )}
      </Card>

      {/* Payments & invoices */}
      {canManageFinance && (
        <Card>
          <CardHeader title="Payments" subtitle="Full transaction history for this member" />
          <div className="border-b border-[var(--dg-line)] p-5">
            <form action={recordAdHocPayment} className="grid gap-3 sm:grid-cols-5">
              <input type="hidden" name="memberId" value={memberId} />
              <Input name="amount" type="number" step="0.01" min="0" placeholder="Amount" required />
              <Select name="method" defaultValue="CASH">
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="UPI">UPI</option>
                <option value="OTHER">Other</option>
              </Select>
              <Input name="reference" placeholder="Reference" />
              <Input name="notes" placeholder="Notes (e.g. PT session)" />
              <Button type="submit" size="sm">
                Record payment
              </Button>
            </form>
          </div>
          <div className="divide-y divide-[var(--dg-line)]">
            {payments.length === 0 && <p className="px-5 py-6 text-sm text-[var(--dg-slate)]">No payments yet.</p>}
            {payments.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <span className="text-[var(--dg-slate)]">{formatDate(p.paidAt)}</span>
                <Badge tone={p.method}>{p.method.replace("_", " ")}</Badge>
                <span className="text-[var(--dg-slate)]">{p.reference || p.notes || "—"}</span>
                <Badge tone={p.status}>{p.status.replace("_", " ")}</Badge>
                <span className="font-semibold text-[var(--dg-ink)]">{formatMoney(p.amount)}</span>
                {p.status === "COMPLETED" && (
                  <form action={issueRefund} className="flex items-center gap-1">
                    <input type="hidden" name="paymentId" value={p.id} />
                    <input type="hidden" name="memberId" value={memberId} />
                    <input type="hidden" name="amount" value={p.amount} />
                    <input type="hidden" name="reason" value="Refund issued from member profile" />
                    <Button type="submit" size="sm" variant="ghost">
                      Refund
                    </Button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Attendance */}
      <Card>
        <CardHeader title="Attendance" subtitle="Recent check-ins" />
        <div className="divide-y divide-[var(--dg-line)]">
          {attendanceLog.length === 0 && <p className="px-5 py-6 text-sm text-[var(--dg-slate)]">No check-ins recorded.</p>}
          {attendanceLog.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
              <span className="text-[var(--dg-ink)]">{formatDate(a.checkInAt)}</span>
              <Badge tone="OK">{a.method}</Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Communications */}
      <Card>
        <CardHeader title="Communications log" />
        <form action={addCommunication} className="grid gap-3 border-b border-[var(--dg-line)] p-5 sm:grid-cols-4">
          <input type="hidden" name="memberId" value={memberId} />
          <Select name="type" defaultValue="NOTE">
            <option value="NOTE">Note</option>
            <option value="CALL">Call</option>
            <option value="EMAIL">Email</option>
            <option value="COMPLAINT">Complaint</option>
            <option value="FOLLOW_UP">Follow-up</option>
          </Select>
          <Input name="subject" placeholder="Subject" className="sm:col-span-1" />
          <Input name="body" placeholder="Details" className="sm:col-span-1" />
          <Button type="submit" size="sm">
            Log entry
          </Button>
        </form>
        <div className="divide-y divide-[var(--dg-line)]">
          {communications.length === 0 && <p className="px-5 py-6 text-sm text-[var(--dg-slate)]">No communications logged.</p>}
          {communications.map((c) => (
            <div key={c.id} className="px-5 py-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge tone="OK">{c.type.replace("_", " ")}</Badge>
                <span className="font-medium text-[var(--dg-ink)]">{c.subject}</span>
                <span className="ml-auto text-xs text-[var(--dg-slate)]">{formatDate(c.createdAt)}</span>
              </div>
              {c.body && <p className="mt-1 text-xs text-[var(--dg-slate)]">{c.body}</p>}
            </div>
          ))}
        </div>
      </Card>

      {/* Goals */}
      <Card>
        <CardHeader title="Goals & progress" />
        <form action={addGoal} className="grid gap-3 border-b border-[var(--dg-line)] p-5 sm:grid-cols-5">
          <input type="hidden" name="memberId" value={memberId} />
          <Input name="goalType" placeholder="Goal (e.g. Weight loss)" required />
          <Input name="targetValue" type="number" step="0.1" placeholder="Target" />
          <Input name="currentValue" type="number" step="0.1" placeholder="Current" />
          <Input name="unit" placeholder="Unit (kg, reps…)" />
          <Button type="submit" size="sm">
            Add goal
          </Button>
        </form>
        <div className="divide-y divide-[var(--dg-line)]">
          {goals.length === 0 && <p className="px-5 py-6 text-sm text-[var(--dg-slate)]">No goals set.</p>}
          {goals.map((g) => (
            <div key={g.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
              <div>
                <p className="font-medium text-[var(--dg-ink)]">{g.goalType}</p>
                <p className="text-xs text-[var(--dg-slate)]">
                  {g.currentValue ?? "—"} / {g.targetValue ?? "—"} {g.unit}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={g.status === "ACHIEVED" ? "COMPLETED" : "OK"}>{g.status.replace("_", " ")}</Badge>
                <form action={updateGoalProgress} className="flex items-center gap-1">
                  <input type="hidden" name="goalId" value={g.id} />
                  <input type="hidden" name="memberId" value={memberId} />
                  <Input name="currentValue" type="number" step="0.1" defaultValue={g.currentValue ?? ""} className="w-20" />
                  <Button type="submit" size="sm" variant="ghost">
                    Update
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader title="Documents" />
        <div className="flex flex-wrap gap-4 p-5">
          {documents.length === 0 && <p className="text-sm text-[var(--dg-slate)]">No documents on file.</p>}
          {documents.map((doc) => (
            <div key={doc.id}>
              <p className="mb-1 text-xs text-[var(--dg-slate)]">{doc.type.replace("_", " ")}</p>
              {doc.fileDataUrl.startsWith("data:image") ? (
                <img src={doc.fileDataUrl} alt={doc.fileName} className="h-20 w-20 rounded-lg object-cover ring-1 ring-[var(--dg-line)]" />
              ) : (
                <a href={doc.fileDataUrl} download={doc.fileName} className="text-xs font-medium text-[var(--dg-accent)]">
                  {doc.fileName}
                </a>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
