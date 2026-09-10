import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardHeader, Badge, Button, Textarea } from "@/components/ui/primitives";
import { formatDate, formatMoney } from "@/lib/business";
import { approveRegistration, rejectRegistration } from "../actions";

export const dynamic = "force-dynamic";

export default async function RegistrationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const registrationId = Number(id);

  const [reg] = await db.select().from(schema.registrations).where(eq(schema.registrations.id, registrationId)).limit(1);
  if (!reg) notFound();

  const [member] = await db.select().from(schema.members).where(eq(schema.members.id, reg.memberId)).limit(1);
  const plan = reg.requestedPlanId
    ? (await db.select().from(schema.plans).where(eq(schema.plans.id, reg.requestedPlanId)).limit(1))[0]
    : undefined;
  const documents = await db.select().from(schema.documents).where(eq(schema.documents.memberId, reg.memberId));
  const [waiver] = await db
    .select()
    .from(schema.waivers)
    .where(eq(schema.waivers.memberId, reg.memberId))
    .orderBy(schema.waivers.signedAt)
    .limit(1);
  const payments = await db.select().from(schema.payments).where(eq(schema.payments.memberId, reg.memberId));

  if (!member) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--dg-ink)]">
            {member.firstName} {member.lastName}
          </h1>
          <p className="text-sm text-[var(--dg-slate)]">
            {member.memberCode} &middot; Applied {formatDate(reg.submittedAt)}
          </p>
        </div>
        <Badge tone={reg.status}>{reg.status}</Badge>
      </div>

      <Card>
        <CardHeader title="Applicant details" />
        <dl className="grid grid-cols-2 gap-4 p-5 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-[var(--dg-slate)]">Email</dt>
            <dd className="font-medium text-[var(--dg-ink)]">{member.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--dg-slate)]">Phone</dt>
            <dd className="font-medium text-[var(--dg-ink)]">{member.phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--dg-slate)]">Date of birth</dt>
            <dd className="font-medium text-[var(--dg-ink)]">{formatDate(member.dob)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--dg-slate)]">Emergency contact</dt>
            <dd className="font-medium text-[var(--dg-ink)]">
              {member.emergencyContactName} ({member.emergencyContactRelation ?? "n/a"}) — {member.emergencyContactPhone}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--dg-slate)]">Referral source</dt>
            <dd className="font-medium text-[var(--dg-ink)]">{member.referralSource?.replace("_", " ")}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--dg-slate)]">Requested plan</dt>
            <dd className="font-medium text-[var(--dg-ink)]">{plan ? `${plan.name} — ${formatMoney(plan.price)}` : "—"}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <CardHeader title="Documents" />
        <div className="flex flex-wrap gap-4 p-5">
          {member.photoUrl && (
            <div>
              <p className="mb-1 text-xs text-[var(--dg-slate)]">Photo</p>
              <img src={member.photoUrl} alt="Member" className="h-24 w-24 rounded-lg object-cover ring-1 ring-[var(--dg-line)]" />
            </div>
          )}
          {documents.map((doc) => (
            <div key={doc.id}>
              <p className="mb-1 text-xs text-[var(--dg-slate)]">{doc.type.replace("_", " ")}</p>
              {doc.fileDataUrl.startsWith("data:image") ? (
                <img src={doc.fileDataUrl} alt={doc.fileName} className="h-24 w-24 rounded-lg object-cover ring-1 ring-[var(--dg-line)]" />
              ) : (
                <a href={doc.fileDataUrl} download={doc.fileName} className="text-xs font-medium text-[var(--dg-accent)]">
                  {doc.fileName}
                </a>
              )}
            </div>
          ))}
          {!member.photoUrl && documents.length === 0 && (
            <p className="text-sm text-[var(--dg-slate)]">No documents uploaded.</p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Waiver" />
        <div className="p-5 text-sm">
          {waiver ? (
            <>
              <p className="text-[var(--dg-ink)]">
                Signed by <span className="font-semibold">{waiver.signedName}</span> on {formatDate(waiver.signedAt)}
              </p>
              {waiver.signatureDataUrl && (
                <img src={waiver.signatureDataUrl} alt="Signature" className="mt-3 h-20 rounded border border-[var(--dg-line)] bg-white" />
              )}
            </>
          ) : (
            <p className="text-[var(--dg-slate)]">No waiver on file.</p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Payment captured at signup" />
        <div className="divide-y divide-[var(--dg-line)]">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <Badge tone={p.method}>{p.method.replace("_", " ")}</Badge>
              <span className="text-[var(--dg-slate)]">{p.reference || "No reference"}</span>
              <Badge tone={p.status}>{p.status}</Badge>
              <span className="font-semibold text-[var(--dg-ink)]">{formatMoney(p.amount)}</span>
            </div>
          ))}
          {payments.length === 0 && <p className="px-5 py-4 text-sm text-[var(--dg-slate)]">No payment captured.</p>}
        </div>
      </Card>

      {reg.status === "PENDING" ? (
        <Card>
          <CardHeader title="Decision" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <form action={approveRegistration} className="space-y-3">
              <input type="hidden" name="registrationId" value={reg.id} />
              <Textarea name="notes" label="Approval notes (optional)" rows={2} />
              <Button type="submit" className="w-full justify-center">
                Approve &amp; activate membership
              </Button>
            </form>
            <form action={rejectRegistration} className="space-y-3">
              <input type="hidden" name="registrationId" value={reg.id} />
              <Textarea name="notes" label="Reason for rejection (required)" rows={2} required />
              <Button type="submit" variant="danger" className="w-full justify-center">
                Reject application
              </Button>
            </form>
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader title="Decision" />
          <div className="p-5 text-sm text-[var(--dg-slate)]">
            <p>
              Reviewed {formatDate(reg.reviewedAt)}. Notes: {reg.reviewNotes || "—"}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
