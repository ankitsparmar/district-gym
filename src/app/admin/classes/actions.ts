"use server";

import { db, schema } from "@/db";
import { requireStaff } from "@/lib/rbac";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notify } from "@/lib/notify";

export async function createClass(formData: FormData) {
  await requireStaff();
  const name = String(formData.get("name"));
  const trainerId = formData.get("trainerId") ? Number(formData.get("trainerId")) : null;
  const capacity = Number(formData.get("capacity") || 20);
  const durationMinutes = Number(formData.get("durationMinutes") || 60);
  const description = String(formData.get("description") || "");

  await db.insert(schema.classes).values({ name, trainerId, capacity, durationMinutes, description });
  revalidatePath("/admin/classes");
}

export async function scheduleClass(formData: FormData) {
  await requireStaff();
  const classId = Number(formData.get("classId"));
  const startsAt = new Date(String(formData.get("startsAt")));
  const durationMinutes = Number(formData.get("durationMinutes") || 60);
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60000);

  await db.insert(schema.classSchedules).values({ classId, startsAt, endsAt });
  revalidatePath("/admin/classes");
}

export async function bookClassForMember(formData: FormData) {
  await requireStaff();
  const classScheduleId = Number(formData.get("classScheduleId"));
  const memberId = Number(formData.get("memberId"));

  await db
    .insert(schema.classBookings)
    .values({ classScheduleId, memberId, status: "BOOKED" })
    .onConflictDoNothing();

  await notify({
    memberId,
    channel: "EMAIL",
    type: "CLASS_BOOKING_CONFIRMED",
    subject: "Class booking confirmed",
    body: "You're booked in for your class at District Gym. See you there!",
  });

  revalidatePath("/admin/classes");
}

export async function cancelBooking(formData: FormData) {
  await requireStaff();
  const bookingId = Number(formData.get("bookingId"));
  await db.update(schema.classBookings).set({ status: "CANCELLED" }).where(eq(schema.classBookings.id, bookingId));
  revalidatePath("/admin/classes");
}

export async function markAttended(formData: FormData) {
  await requireStaff();
  const bookingId = Number(formData.get("bookingId"));
  await db.update(schema.classBookings).set({ status: "ATTENDED" }).where(eq(schema.classBookings.id, bookingId));
  revalidatePath("/admin/classes");
}
