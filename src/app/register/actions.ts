"use server";

import { db, schema } from "@/db";
import { nextMemberCode } from "@/lib/codes";
import { notifyBothChannels } from "@/lib/notify";
import { WAIVER_TEXT, WAIVER_VERSION } from "@/lib/waiver";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";

async function fileToDataUrl(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const buf = Buffer.from(await file.arrayBuffer());
  return `data:${file.type || "application/octet-stream"};base64,${buf.toString("base64")}`;
}

const registrationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(5, "Phone number required"),
  dob: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  emergencyContactName: z.string().min(1, "Emergency contact required"),
  emergencyContactPhone: z.string().min(5, "Emergency contact phone required"),
  emergencyContactRelation: z.string().optional(),
  planId: z.coerce.number().int().positive("Choose a plan"),
  referralSource: z.enum(["WALK_IN", "ONLINE", "REFERRAL", "SOCIAL_MEDIA", "OTHER"]).default("ONLINE"),
  signedName: z.string().min(1, "Type your full name to sign"),
  agreeWaiver: z.literal("on", { message: "You must accept the waiver to continue" }),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER", "UPI", "OTHER"]),
  paymentAmount: z.coerce.number().min(0),
  paymentReference: z.string().optional(),
});

export type RegistrationFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function submitRegistration(
  _prevState: RegistrationFormState,
  formData: FormData
): Promise<RegistrationFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = registrationSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  const data = parsed.data;

  // Staff-assisted submissions (front desk) are allowed when logged in as staff;
  // public self-registrations have no session.
  const session = await auth();
  const staffRole = (session?.user as any)?.role as string | undefined;
  const submittedByStaff =
    staffRole && staffRole !== "MEMBER" ? ((session?.user as any)?.userId as number | undefined) : undefined;

  const photoFile = formData.get("photo") as File | null;
  const idProofFile = formData.get("idProof") as File | null;
  const medicalFile = formData.get("medicalClearance") as File | null;

  const [photoDataUrl, idProofDataUrl, medicalDataUrl] = await Promise.all([
    fileToDataUrl(photoFile),
    fileToDataUrl(idProofFile),
    fileToDataUrl(medicalFile),
  ]);

  const memberCode = await nextMemberCode();
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for") ?? hdrs.get("x-real-ip") ?? "unknown";

  const [member] = await db
    .insert(schema.members)
    .values({
      memberCode,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      dob: data.dob || null,
      gender: data.gender || null,
      address: data.address || null,
      photoUrl: photoDataUrl,
      emergencyContactName: data.emergencyContactName,
      emergencyContactPhone: data.emergencyContactPhone,
      emergencyContactRelation: data.emergencyContactRelation || null,
      referralSource: data.referralSource,
      status: "PENDING",
    })
    .returning();

  const documentInserts = [];
  if (idProofDataUrl) {
    documentInserts.push({
      memberId: member.id,
      type: "ID_PROOF" as const,
      fileName: idProofFile?.name ?? "id-proof",
      fileDataUrl: idProofDataUrl,
    });
  }
  if (medicalDataUrl) {
    documentInserts.push({
      memberId: member.id,
      type: "MEDICAL_CLEARANCE" as const,
      fileName: medicalFile?.name ?? "medical-clearance",
      fileDataUrl: medicalDataUrl,
    });
  }
  if (documentInserts.length) {
    await db.insert(schema.documents).values(documentInserts);
  }

  const signatureDataUrl = (formData.get("signatureDataUrl") as string) || null;

  await db.insert(schema.waivers).values({
    memberId: member.id,
    waiverVersion: WAIVER_VERSION,
    waiverText: WAIVER_TEXT,
    signedName: data.signedName,
    signatureDataUrl,
    ipAddress: String(ip),
  });

  await db.insert(schema.registrations).values({
    memberId: member.id,
    requestedPlanId: data.planId,
    status: "PENDING",
    submittedByStaff,
  });

  await db.insert(schema.payments).values({
    memberId: member.id,
    amount: data.paymentAmount.toFixed(2),
    method: data.paymentMethod,
    status: "PENDING",
    reference: data.paymentReference || null,
    notes: "Captured at registration; awaiting front-desk/admin confirmation on approval.",
  });

  await notifyBothChannels({
    memberId: member.id,
    type: "GENERIC",
    subject: "We've received your District Gym application",
    body: `Hi ${data.firstName}, thanks for applying to District Gym! Your member code is ${memberCode}. Our team will review your application and confirm your membership shortly.`,
  });

  redirect(`/register/thank-you?code=${encodeURIComponent(memberCode)}`);
}
