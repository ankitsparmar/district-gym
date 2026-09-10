"use server";

import { db, schema } from "@/db";
import { requireMember } from "@/lib/rbac";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export type ProfileState = { error?: string; success?: string };

export async function updateMyProfile(formData: FormData) {
  const { memberId } = await requireMember();
  await db
    .update(schema.members)
    .set({
      phone: String(formData.get("phone") || "") || null,
      address: String(formData.get("address") || "") || null,
      emergencyContactName: String(formData.get("emergencyContactName") || "") || null,
      emergencyContactPhone: String(formData.get("emergencyContactPhone") || "") || null,
      updatedAt: new Date(),
    })
    .where(eq(schema.members.id, memberId));
  revalidatePath("/portal/profile");
}

export async function changeMyPassword(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const { memberId } = await requireMember();
  const newPassword = String(formData.get("newPassword") || "");
  if (newPassword.length < 6) return { error: "Password must be at least 6 characters." };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(schema.members).set({ passwordHash }).where(eq(schema.members.id, memberId));
  return { success: "Password updated." };
}
