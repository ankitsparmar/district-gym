import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { Card, Badge } from "@/components/ui/primitives";
import { formatDate } from "@/lib/business";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const logs = await db
    .select({
      id: schema.auditLogs.id,
      action: schema.auditLogs.action,
      entityType: schema.auditLogs.entityType,
      entityId: schema.auditLogs.entityId,
      details: schema.auditLogs.details,
      createdAt: schema.auditLogs.createdAt,
      actorName: schema.users.name,
    })
    .from(schema.auditLogs)
    .leftJoin(schema.users, eq(schema.users.id, schema.auditLogs.actorUserId))
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(200);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--dg-ink)]">Audit log</h1>
        <p className="text-sm text-[var(--dg-slate)]">Who did what, and when.</p>
      </div>
      <Card>
        <div className="divide-y divide-[var(--dg-line)]">
          {logs.map((l) => (
            <div key={l.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <p className="font-medium text-[var(--dg-ink)]">{l.action}</p>
                <p className="text-xs text-[var(--dg-slate)]">
                  {l.actorName ?? "System"} &middot; {l.entityType} #{l.entityId ?? "—"}
                </p>
              </div>
              <span className="text-xs text-[var(--dg-slate)]">{formatDate(l.createdAt)}</span>
            </div>
          ))}
          {logs.length === 0 && <p className="px-5 py-8 text-center text-sm text-[var(--dg-slate)]">No activity yet.</p>}
        </div>
      </Card>
    </div>
  );
}
