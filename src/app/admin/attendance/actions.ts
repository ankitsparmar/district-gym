"use server";

import { db, schema } from "@/db";
import { requireStaff } from "@/lib/rbac";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type CheckInState = { error?: string; success?: string };

export async function checkInByCode(_prev: CheckInState, formData: FormData): Promise<CheckInState> {
  const { userId } = await requireStaff();
  const code = String(formData.get("code") ?? "").trim();
  const method = (String(formData.get("method") ?? "QR")) as "QR" | "MANUAL" | "RFID" | "BIOMETRIC";
  if (!code) return { error: "Enter a member code" };

  const [member] = await db.select().from(schema.members).where(eq(schema.members.memberCode, code)).limit(1);
  if (!member) return { error: `No member found with code ${code}` };

  if (member.status === "SUSPENDED" || member.status === "CANCELLED") {
    return { error: `${member.firstName} ${member.lastName}'s access is ${member.status.toLowerCase()}. Check-in blocked.` };
  }

  await db.insert(schema.attendance).values({ memberId: member.id, method, recordedBy: userId });
  revalidatePath("/admin/attendance");
  return { success: `Checked in ${member.firstName} ${member.lastName} (${member.memberCode})` };
}
