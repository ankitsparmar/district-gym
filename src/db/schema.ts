import {
  pgTable,
  pgEnum,
  pgSequence,
  serial,
  text,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const roleEnum = pgEnum("role", [
  "ADMIN",
  "MANAGER",
  "FRONT_DESK",
  "TRAINER",
]);

export const planTypeEnum = pgEnum("plan_type", [
  "MONTHLY",
  "QUARTERLY",
  "ANNUAL",
  "PAY_PER_VISIT",
  "FAMILY",
]);

export const memberStatusEnum = pgEnum("member_status", [
  "PENDING",
  "ACTIVE",
  "FROZEN",
  "SUSPENDED",
  "CANCELLED",
]);

export const membershipStatusEnum = pgEnum("membership_status", [
  "ACTIVE",
  "FROZEN",
  "SUSPENDED",
  "CANCELLED",
  "EXPIRED",
]);

export const registrationStatusEnum = pgEnum("registration_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "CASH",
  "CARD",
  "BANK_TRANSFER",
  "UPI",
  "OTHER",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "COMPLETED",
  "REFUNDED",
  "PARTIAL_REFUND",
  "FAILED",
  "PENDING",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "PAID",
  "UNPAID",
  "PARTIAL",
  "OVERDUE",
  "CANCELLED",
]);

export const documentTypeEnum = pgEnum("document_type", [
  "ID_PROOF",
  "MEDICAL_CLEARANCE",
  "CONTRACT",
  "WAIVER",
  "OTHER",
]);

export const membershipChangeTypeEnum = pgEnum("membership_change_type", [
  "UPGRADE",
  "DOWNGRADE",
  "RENEWAL",
  "INITIAL",
  "PLAN_CHANGE",
]);

export const attendanceMethodEnum = pgEnum("attendance_method", [
  "QR",
  "MANUAL",
  "RFID",
  "BIOMETRIC",
]);

export const communicationTypeEnum = pgEnum("communication_type", [
  "CALL",
  "EMAIL",
  "SMS",
  "NOTE",
  "COMPLAINT",
  "FOLLOW_UP",
]);

export const communicationDirectionEnum = pgEnum("communication_direction", [
  "INBOUND",
  "OUTBOUND",
]);

export const ptSessionStatusEnum = pgEnum("pt_session_status", [
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

export const classBookingStatusEnum = pgEnum("class_booking_status", [
  "BOOKED",
  "CANCELLED",
  "ATTENDED",
  "NO_SHOW",
]);

export const expenseCategoryEnum = pgEnum("expense_category", [
  "RENT",
  "EQUIPMENT",
  "SALARIES",
  "UTILITIES",
  "MARKETING",
  "MAINTENANCE",
  "OTHER",
]);

export const commissionStatusEnum = pgEnum("commission_status", [
  "PENDING",
  "PAID",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "EMAIL",
  "SMS",
  "PUSH",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "PAYMENT_UPCOMING",
  "PAYMENT_DUE_TODAY",
  "PAYMENT_OVERDUE",
  "WELCOME",
  "REGISTRATION_APPROVED",
  "REGISTRATION_REJECTED",
  "FREEZE_CONFIRMED",
  "SUSPENSION_NOTICE",
  "CLASS_BOOKING_CONFIRMED",
  "GENERIC",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "QUEUED",
  "SENT",
  "FAILED",
]);

export const referralSourceEnum = pgEnum("referral_source", [
  "WALK_IN",
  "ONLINE",
  "REFERRAL",
  "SOCIAL_MEDIA",
  "OTHER",
]);

// ---------------------------------------------------------------------------
// Sequences (for human-friendly codes: member codes, invoice numbers)
// ---------------------------------------------------------------------------

export const memberCodeSeq = pgSequence("member_code_seq", { startWith: 1, increment: 1 });
export const invoiceNumberSeq = pgSequence("invoice_number_seq", { startWith: 1, increment: 1 });

// ---------------------------------------------------------------------------
// Users (staff / admin / trainers login)
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("FRONT_DESK"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  emailIdx: uniqueIndex("users_email_idx").on(t.email),
}));

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  type: planTypeEnum("type").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  billingIntervalMonths: integer("billing_interval_months").notNull().default(1),
  visitsIncluded: integer("visits_included"),
  familyMaxMembers: integer("family_max_members"),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  memberCode: varchar("member_code", { length: 20 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  dob: date("dob"),
  gender: varchar("gender", { length: 30 }),
  address: text("address"),
  photoUrl: text("photo_url"),
  emergencyContactName: varchar("emergency_contact_name", { length: 200 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 30 }),
  emergencyContactRelation: varchar("emergency_contact_relation", { length: 100 }),
  referralSource: referralSourceEnum("referral_source").default("WALK_IN"),
  status: memberStatusEnum("status").notNull().default("PENDING"),
  familyGroupId: integer("family_group_id"),
  passwordHash: text("password_hash"), // for member self-service portal login
  loginEmail: varchar("login_email", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  memberCodeIdx: uniqueIndex("members_code_idx").on(t.memberCode),
  emailIdx: index("members_email_idx").on(t.email),
}));

export const memberTags = pgTable("member_tags", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  tag: varchar("tag", { length: 60 }).notNull(),
  addedBy: integer("added_by").references(() => users.id),
  addedAt: timestamp("added_at").notNull().defaultNow(),
}, (t) => ({
  memberTagIdx: uniqueIndex("member_tag_unique_idx").on(t.memberId, t.tag),
}));

// ---------------------------------------------------------------------------
// Registrations (self sign-up, pending admin approval)
// ---------------------------------------------------------------------------

export const registrations = pgTable("registrations", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  requestedPlanId: integer("requested_plan_id").references(() => plans.id),
  status: registrationStatusEnum("status").notNull().default("PENDING"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  submittedByStaff: integer("submitted_by_staff").references(() => users.id), // if front-desk submitted on behalf of walk-in
});

// ---------------------------------------------------------------------------
// Documents & Waivers
// ---------------------------------------------------------------------------

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  type: documentTypeEnum("type").notNull(),
  fileName: varchar("file_name", { length: 300 }).notNull(),
  fileDataUrl: text("file_data_url").notNull(), // stored as data URL for this self-contained demo
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const waivers = pgTable("waivers", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  waiverVersion: varchar("waiver_version", { length: 30 }).notNull().default("v1"),
  waiverText: text("waiver_text").notNull(),
  signedName: varchar("signed_name", { length: 200 }).notNull(),
  signatureDataUrl: text("signature_data_url"),
  signedAt: timestamp("signed_at").notNull().defaultNow(),
  ipAddress: varchar("ip_address", { length: 60 }),
});

// ---------------------------------------------------------------------------
// Memberships (a member's subscription instance to a plan)
// ---------------------------------------------------------------------------

export const memberships = pgTable("memberships", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  planId: integer("plan_id").notNull().references(() => plans.id),
  status: membershipStatusEnum("status").notNull().default("ACTIVE"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  nextDueDate: date("next_due_date"),
  priceAtSignup: numeric("price_at_signup", { precision: 10, scale: 2 }).notNull(),
  autoRenew: boolean("auto_renew").notNull().default(true),
  visitsRemaining: integer("visits_remaining"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  memberIdx: index("memberships_member_idx").on(t.memberId),
  dueDateIdx: index("memberships_due_date_idx").on(t.nextDueDate),
}));

export const membershipFreezes = pgTable("membership_freezes", {
  id: serial("id").primaryKey(),
  membershipId: integer("membership_id").notNull().references(() => memberships.id, { onDelete: "cascade" }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  reason: text("reason"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const membershipChanges = pgTable("membership_changes", {
  id: serial("id").primaryKey(),
  membershipId: integer("membership_id").notNull().references(() => memberships.id, { onDelete: "cascade" }),
  fromPlanId: integer("from_plan_id").references(() => plans.id),
  toPlanId: integer("to_plan_id").references(() => plans.id),
  type: membershipChangeTypeEnum("type").notNull(),
  changeDate: timestamp("change_date").notNull().defaultNow(),
  prorationAmount: numeric("proration_amount", { precision: 10, scale: 2 }),
  reason: text("reason"),
  createdBy: integer("created_by").references(() => users.id),
});

export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  membershipId: integer("membership_id").notNull().references(() => memberships.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 300 }),
  fileDataUrl: text("file_data_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Invoices, Payments, Refunds
// ---------------------------------------------------------------------------

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 40 }).notNull(),
  memberId: integer("member_id").notNull().references(() => members.id),
  membershipId: integer("membership_id").references(() => memberships.id),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  status: invoiceStatusEnum("status").notNull().default("UNPAID"),
  lineItems: jsonb("line_items").notNull(),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  invNumIdx: uniqueIndex("invoices_number_idx").on(t.invoiceNumber),
}));

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => members.id),
  membershipId: integer("membership_id").references(() => memberships.id),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  method: paymentMethodEnum("method").notNull().default("CASH"),
  status: paymentStatusEnum("status").notNull().default("COMPLETED"),
  reference: varchar("reference", { length: 120 }), // dummy/manual reference e.g. receipt no, cheque no
  notes: text("notes"),
  paidAt: timestamp("paid_at").notNull().defaultNow(),
  recordedBy: integer("recorded_by").references(() => users.id),
}, (t) => ({
  memberIdx: index("payments_member_idx").on(t.memberId),
  paidAtIdx: index("payments_paid_at_idx").on(t.paidAt),
}));

export const refunds = pgTable("refunds", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").notNull().references(() => payments.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason"),
  processedBy: integer("processed_by").references(() => users.id),
  processedAt: timestamp("processed_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  checkInAt: timestamp("check_in_at").notNull().defaultNow(),
  checkOutAt: timestamp("check_out_at"),
  method: attendanceMethodEnum("method").notNull().default("MANUAL"),
  recordedBy: integer("recorded_by").references(() => users.id),
}, (t) => ({
  memberIdx: index("attendance_member_idx").on(t.memberId),
  checkInIdx: index("attendance_checkin_idx").on(t.checkInAt),
}));

// ---------------------------------------------------------------------------
// Communications log
// ---------------------------------------------------------------------------

export const communications = pgTable("communications", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  type: communicationTypeEnum("type").notNull(),
  direction: communicationDirectionEnum("direction").notNull().default("OUTBOUND"),
  subject: varchar("subject", { length: 250 }),
  body: text("body"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Goals / progress
// ---------------------------------------------------------------------------

export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  goalType: varchar("goal_type", { length: 100 }).notNull(),
  description: text("description"),
  targetValue: numeric("target_value", { precision: 10, scale: 2 }),
  currentValue: numeric("current_value", { precision: 10, scale: 2 }),
  unit: varchar("unit", { length: 30 }),
  targetDate: date("target_date"),
  status: varchar("status", { length: 30 }).notNull().default("IN_PROGRESS"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Trainers, PT sessions, Classes, Bookings
// ---------------------------------------------------------------------------

export const trainers = pgTable("trainers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bio: text("bio"),
  specialties: varchar("specialties", { length: 300 }),
  commissionRate: numeric("commission_rate", { precision: 5, scale: 2 }).default("0"),
  active: boolean("active").notNull().default(true),
}, (t) => ({
  userIdx: uniqueIndex("trainers_user_idx").on(t.userId),
}));

export const ptSessions = pgTable("pt_sessions", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").notNull().references(() => trainers.id, { onDelete: "cascade" }),
  memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  scheduledAt: timestamp("scheduled_at").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  status: ptSessionStatusEnum("status").notNull().default("SCHEDULED"),
  notes: text("notes"),
  price: numeric("price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  trainerId: integer("trainer_id").references(() => trainers.id),
  description: text("description"),
  capacity: integer("capacity").notNull().default(20),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  active: boolean("active").notNull().default(true),
});

export const classSchedules = pgTable("class_schedules", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  capacity: integer("capacity"),
});

export const classBookings = pgTable("class_bookings", {
  id: serial("id").primaryKey(),
  classScheduleId: integer("class_schedule_id").notNull().references(() => classSchedules.id, { onDelete: "cascade" }),
  memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  status: classBookingStatusEnum("status").notNull().default("BOOKED"),
  bookedAt: timestamp("booked_at").notNull().defaultNow(),
}, (t) => ({
  uniqueBooking: uniqueIndex("class_booking_unique_idx").on(t.classScheduleId, t.memberId),
}));

// ---------------------------------------------------------------------------
// Expenses & Commissions (financials)
// ---------------------------------------------------------------------------

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  category: expenseCategoryEnum("category").notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  recordedBy: integer("recorded_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const commissions = pgTable("commissions", {
  id: serial("id").primaryKey(),
  trainerId: integer("trainer_id").notNull().references(() => trainers.id, { onDelete: "cascade" }),
  ptSessionId: integer("pt_session_id").references(() => ptSessions.id),
  classId: integer("class_id").references(() => classes.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  periodStart: date("period_start"),
  periodEnd: date("period_end"),
  status: commissionStatusEnum("status").notNull().default("PENDING"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Notifications (reminders sent via email/SMS/push)
// ---------------------------------------------------------------------------

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id, { onDelete: "cascade" }),
  channel: notificationChannelEnum("channel").notNull(),
  type: notificationTypeEnum("type").notNull(),
  subject: varchar("subject", { length: 250 }),
  body: text("body").notNull(),
  status: notificationStatusEnum("status").notNull().default("QUEUED"),
  error: text("error"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actor_user_id").references(() => users.id),
  action: varchar("action", { length: 150 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: integer("entity_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  entityIdx: index("audit_entity_idx").on(t.entityType, t.entityId),
}));

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const membersRelations = relations(members, ({ many }) => ({
  memberships: many(memberships),
  documents: many(documents),
  waivers: many(waivers),
  payments: many(payments),
  attendance: many(attendance),
  communications: many(communications),
  goals: many(goals),
  tags: many(memberTags),
  registrations: many(registrations),
}));

export const membershipsRelations = relations(memberships, ({ one, many }) => ({
  member: one(members, { fields: [memberships.memberId], references: [members.id] }),
  plan: one(plans, { fields: [memberships.planId], references: [plans.id] }),
  freezes: many(membershipFreezes),
  changes: many(membershipChanges),
  contracts: many(contracts),
}));

export const plansRelations = relations(plans, ({ many }) => ({
  memberships: many(memberships),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  member: one(members, { fields: [payments.memberId], references: [members.id] }),
  invoice: one(invoices, { fields: [payments.invoiceId], references: [invoices.id] }),
  refunds: many(refunds),
}));

export const trainersRelations = relations(trainers, ({ one, many }) => ({
  user: one(users, { fields: [trainers.userId], references: [users.id] }),
  ptSessions: many(ptSessions),
  classes: many(classes),
  commissions: many(commissions),
}));
