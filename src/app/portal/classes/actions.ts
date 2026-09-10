"use server";

import { db, schema } from "@/db";
import { requireMember } from "@/lib/rbac";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function bookClass(formData: FormData) {
  const { memberId } = await requireMember();
  const classScheduleId = Number(formData.get("classScheduleId"));
  await db.insert(schema.classBookings).values({ classScheduleId, memberId, status: "BOOKED" }).onConflictDoNothing();
  revalidatePath("/portal/classes");
}

export async function cancelMyBooking(formData: FormData) {
  const { memberId } = await requireMember();
  const bookingId = Number(formData.get("bookingId"));
  const [booking] = await db.select().from(schema.classBookings).where(eq(schema.classBookings.id, bookingId)).limit(1);
  if (booking && booking.memberId === memberId) {
    await db.update(schema.classBookings).set({ status: "CANCELLED" }).where(eq(schema.classBookings.id, bookingId));
  }
  revalidatePath("/portal/classes");
}
