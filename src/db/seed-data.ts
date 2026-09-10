import { db, schema } from "./index";
import bcrypt from "bcryptjs";
import { nextMemberCode, nextInvoiceNumber } from "../lib/codes";
import { computeNextDueDate } from "../lib/business";
import { WAIVER_TEXT, WAIVER_VERSION } from "../lib/waiver";

// Shared demo-data seeding logic, callable both from the CLI script
// (src/db/seed.ts, `npm run db:seed`) and from the protected
// /api/setup/bootstrap route (used when a local machine can't reach the
// production database directly).
export async function seedDemoData() {
  console.log("Seeding District Gym database...");

  // --- Staff users ---------------------------------------------------------
  const adminPassword = await bcrypt.hash("admin123", 10);
  const managerPassword = await bcrypt.hash("manager123", 10);
  const frontDeskPassword = await bcrypt.hash("frontdesk123", 10);
  const trainerPassword = await bcrypt.hash("trainer123", 10);

  const [admin] = await db
    .insert(schema.users)
    .values({ name: "Ankit Admin", email: "admin@districtgym.com", passwordHash: adminPassword, role: "ADMIN" })
    .onConflictDoNothing()
    .returning();

  const [manager] = await db
    .insert(schema.users)
    .values({ name: "Morgan Manager", email: "manager@districtgym.com", passwordHash: managerPassword, role: "MANAGER" })
    .onConflictDoNothing()
    .returning();

  const [frontDesk] = await db
    .insert(schema.users)
    .values({ name: "Frankie FrontDesk", email: "frontdesk@districtgym.com", passwordHash: frontDeskPassword, role: "FRONT_DESK" })
    .onConflictDoNothing()
    .returning();

  const [trainerUser] = await db
    .insert(schema.users)
    .values({ name: "Taylor Trainer", email: "trainer@districtgym.com", passwordHash: trainerPassword, role: "TRAINER" })
    .onConflictDoNothing()
    .returning();

  const staffUserId = admin?.id ?? 1;
  void manager;
  void frontDesk;

  // --- Trainer profile -------------------------------------------------------
  let trainer;
  if (trainerUser) {
    [trainer] = await db
      .insert(schema.trainers)
      .values({ userId: trainerUser.id, bio: "Strength & conditioning specialist", specialties: "Strength, HIIT", commissionRate: "25" })
      .onConflictDoNothing()
      .returning();
  }

  // --- Plans -------------------------------------------------------------
  const planSeed = [
    { name: "Basic Monthly", type: "MONTHLY" as const, price: "35.00", billingIntervalMonths: 1, description: "Full gym access, standard hours." },
    { name: "Gold Monthly", type: "MONTHLY" as const, price: "55.00", billingIntervalMonths: 1, description: "Full access + 2 classes/week." },
    { name: "Gold Quarterly", type: "QUARTERLY" as const, price: "150.00", billingIntervalMonths: 3, description: "Gold benefits, billed quarterly." },
    { name: "Annual Unlimited", type: "ANNUAL" as const, price: "500.00", billingIntervalMonths: 12, description: "Unlimited access, best value." },
    { name: "Pay Per Visit", type: "PAY_PER_VISIT" as const, price: "12.00", billingIntervalMonths: 1, visitsIncluded: 1, description: "Single visit pass." },
    { name: "Family Plan", type: "FAMILY" as const, price: "90.00", billingIntervalMonths: 1, familyMaxMembers: 4, description: "Up to 4 family members." },
  ];

  const plans = [];
  for (const p of planSeed) {
    const [row] = await db.insert(schema.plans).values(p).onConflictDoNothing().returning();
    if (row) plans.push(row);
  }
  const allPlans = plans.length ? plans : await db.select().from(schema.plans);
  const goldMonthly = allPlans.find((p) => p.name === "Gold Monthly") ?? allPlans[0];
  const basicMonthly = allPlans.find((p) => p.name === "Basic Monthly") ?? allPlans[0];

  // --- Demo members --------------------------------------------------------
  const demoMembers = [
    { firstName: "Jamie", lastName: "Oliver", email: "jamie.oliver@example.com", plan: goldMonthly, daysAgoJoined: 60, status: "ACTIVE" as const },
    { firstName: "Priya", lastName: "Nair", email: "priya.nair@example.com", plan: basicMonthly, daysAgoJoined: 20, status: "ACTIVE" as const },
    { firstName: "Sam", lastName: "Taylor", email: "sam.taylor@example.com", plan: goldMonthly, daysAgoJoined: 400, status: "ACTIVE" as const },
    { firstName: "Alex", lastName: "Chen", email: "alex.chen@example.com", plan: basicMonthly, daysAgoJoined: 10, status: "FROZEN" as const },
    { firstName: "Robin", lastName: "Banks", email: "robin.banks@example.com", plan: goldMonthly, daysAgoJoined: 45, status: "SUSPENDED" as const },
  ];

  for (const dm of demoMembers) {
    const code = await nextMemberCode();
    const loginPassword = await bcrypt.hash("member123", 10);
    const [member] = await db
      .insert(schema.members)
      .values({
        memberCode: code,
        firstName: dm.firstName,
        lastName: dm.lastName,
        email: dm.email,
        loginEmail: dm.email,
        passwordHash: loginPassword,
        phone: "+44 7000 000000",
        emergencyContactName: "Emergency Contact",
        emergencyContactPhone: "+44 7000 111111",
        emergencyContactRelation: "Friend",
        referralSource: "ONLINE",
        status: dm.status,
      })
      .returning();

    await db.insert(schema.waivers).values({
      memberId: member.id,
      waiverVersion: WAIVER_VERSION,
      waiverText: WAIVER_TEXT,
      signedName: `${dm.firstName} ${dm.lastName}`,
      ipAddress: "127.0.0.1",
    });

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dm.daysAgoJoined);
    const nextDue = computeNextDueDate(startDate, dm.plan.billingIntervalMonths);
    // Make Sam Taylor's due date overdue for demo purposes.
    const dueDate = dm.lastName === "Taylor" ? new Date(Date.now() - 3 * 86400000) : nextDue;

    const [membership] = await db
      .insert(schema.memberships)
      .values({
        memberId: member.id,
        planId: dm.plan.id,
        status: dm.status === "ACTIVE" ? "ACTIVE" : dm.status,
        startDate: startDate.toISOString().slice(0, 10),
        nextDueDate: dueDate.toISOString().slice(0, 10),
        priceAtSignup: dm.plan.price,
      })
      .returning();

    await db.insert(schema.membershipChanges).values({
      membershipId: membership.id,
      toPlanId: dm.plan.id,
      type: "INITIAL",
      reason: "Seed data initial signup",
      createdBy: staffUserId,
    });

    const invoiceNumber = await nextInvoiceNumber();
    const [invoice] = await db
      .insert(schema.invoices)
      .values({
        invoiceNumber,
        memberId: member.id,
        membershipId: membership.id,
        subtotal: dm.plan.price,
        taxRate: "0",
        taxAmount: "0",
        total: dm.plan.price,
        status: "PAID",
        lineItems: [{ description: `${dm.plan.name} membership`, amount: dm.plan.price }],
        issueDate: startDate.toISOString().slice(0, 10),
        dueDate: startDate.toISOString().slice(0, 10),
      })
      .returning();

    await db.insert(schema.payments).values({
      memberId: member.id,
      membershipId: membership.id,
      invoiceId: invoice.id,
      amount: dm.plan.price,
      method: (["CASH", "CARD", "BANK_TRANSFER", "UPI"] as const)[Math.floor(Math.random() * 4)],
      status: "COMPLETED",
      recordedBy: staffUserId,
    });

    // Attendance history
    for (let i = 0; i < 5; i++) {
      const visitDate = new Date();
      visitDate.setDate(visitDate.getDate() - i * 3);
      await db.insert(schema.attendance).values({ memberId: member.id, checkInAt: visitDate, method: "QR", recordedBy: staffUserId });
    }

    // Goal
    await db.insert(schema.goals).values({
      memberId: member.id,
      goalType: "Weight training",
      description: "Build strength",
      targetValue: "80",
      currentValue: "65",
      unit: "kg squat",
      status: "IN_PROGRESS",
    });

    // Tag
    if (dm.lastName === "Oliver") {
      await db.insert(schema.memberTags).values({ memberId: member.id, tag: "VIP", addedBy: staffUserId });
    }
    if (dm.status === "SUSPENDED") {
      await db.insert(schema.memberTags).values({ memberId: member.id, tag: "at-risk", addedBy: staffUserId });
    }
  }

  // --- Pending registration for demo approval queue -------------------------
  const pendingCode = await nextMemberCode();
  const [pendingMember] = await db
    .insert(schema.members)
    .values({
      memberCode: pendingCode,
      firstName: "Nina",
      lastName: "Patel",
      email: "nina.patel@example.com",
      phone: "+44 7000 222222",
      emergencyContactName: "Raj Patel",
      emergencyContactPhone: "+44 7000 333333",
      emergencyContactRelation: "Sibling",
      referralSource: "SOCIAL_MEDIA",
      status: "PENDING",
    })
    .returning();

  await db.insert(schema.waivers).values({
    memberId: pendingMember.id,
    waiverVersion: WAIVER_VERSION,
    waiverText: WAIVER_TEXT,
    signedName: "Nina Patel",
    ipAddress: "127.0.0.1",
  });

  await db.insert(schema.registrations).values({
    memberId: pendingMember.id,
    requestedPlanId: goldMonthly.id,
    status: "PENDING",
  });

  await db.insert(schema.payments).values({
    memberId: pendingMember.id,
    amount: goldMonthly.price,
    method: "CASH",
    status: "PENDING",
    notes: "Captured at registration; awaiting front-desk/admin confirmation on approval.",
  });

  // --- Expenses ------------------------------------------------------------
  const expenseSeed = [
    { category: "RENT" as const, description: "Monthly unit lease", amount: "2500.00" },
    { category: "EQUIPMENT" as const, description: "New dumbbell set", amount: "800.00" },
    { category: "SALARIES" as const, description: "Front desk payroll", amount: "3200.00" },
    { category: "UTILITIES" as const, description: "Electricity & water", amount: "450.00" },
    { category: "MARKETING" as const, description: "Instagram ads", amount: "150.00" },
  ];
  for (const e of expenseSeed) {
    await db.insert(schema.expenses).values({ ...e, date: new Date().toISOString().slice(0, 10), recordedBy: staffUserId });
  }

  // --- Classes ---------------------------------------------------------------
  if (trainer) {
    const [hiit] = await db
      .insert(schema.classes)
      .values({ name: "HIIT Circuit", trainerId: trainer.id, capacity: 15, durationMinutes: 45, description: "High intensity interval training" })
      .returning();

    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() + 2);
    startsAt.setHours(18, 0, 0, 0);
    const endsAt = new Date(startsAt.getTime() + 45 * 60000);
    await db.insert(schema.classSchedules).values({ classId: hiit.id, startsAt, endsAt });
  }

  console.log("Seed complete.");
}
