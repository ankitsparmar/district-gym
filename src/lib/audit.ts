import { db, schema } from "@/db";

export async function logAudit(opts: {
  actorUserId?: number;
  action: string;
  entityType: string;
  entityId?: number;
  details?: Record<string, unknown>;
}) {
  try {
    await db.insert(schema.auditLogs).values({
      actorUserId: opts.actorUserId,
      action: opts.action,
      entityType: opts.entityType,
      entityId: opts.entityId,
      details: opts.details ?? {},
    });
  } catch (err) {
    console.warn("[audit] failed to write audit log:", err);
  }
}
