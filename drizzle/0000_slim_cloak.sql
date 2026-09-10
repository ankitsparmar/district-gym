CREATE TYPE "public"."attendance_method" AS ENUM('QR', 'MANUAL', 'RFID', 'BIOMETRIC');--> statement-breakpoint
CREATE TYPE "public"."class_booking_status" AS ENUM('BOOKED', 'CANCELLED', 'ATTENDED', 'NO_SHOW');--> statement-breakpoint
CREATE TYPE "public"."commission_status" AS ENUM('PENDING', 'PAID');--> statement-breakpoint
CREATE TYPE "public"."communication_direction" AS ENUM('INBOUND', 'OUTBOUND');--> statement-breakpoint
CREATE TYPE "public"."communication_type" AS ENUM('CALL', 'EMAIL', 'SMS', 'NOTE', 'COMPLAINT', 'FOLLOW_UP');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('ID_PROOF', 'MEDICAL_CLEARANCE', 'CONTRACT', 'WAIVER', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."expense_category" AS ENUM('RENT', 'EQUIPMENT', 'SALARIES', 'UTILITIES', 'MARKETING', 'MAINTENANCE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('PAID', 'UNPAID', 'PARTIAL', 'OVERDUE', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('PENDING', 'ACTIVE', 'FROZEN', 'SUSPENDED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."membership_change_type" AS ENUM('UPGRADE', 'DOWNGRADE', 'RENEWAL', 'INITIAL', 'PLAN_CHANGE');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('ACTIVE', 'FROZEN', 'SUSPENDED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('EMAIL', 'SMS', 'PUSH');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('QUEUED', 'SENT', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('PAYMENT_UPCOMING', 'PAYMENT_DUE_TODAY', 'PAYMENT_OVERDUE', 'WELCOME', 'REGISTRATION_APPROVED', 'REGISTRATION_REJECTED', 'FREEZE_CONFIRMED', 'SUSPENSION_NOTICE', 'CLASS_BOOKING_CONFIRMED', 'GENERIC');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('CASH', 'CARD', 'BANK_TRANSFER', 'UPI', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('COMPLETED', 'REFUNDED', 'PARTIAL_REFUND', 'FAILED', 'PENDING');--> statement-breakpoint
CREATE TYPE "public"."plan_type" AS ENUM('MONTHLY', 'QUARTERLY', 'ANNUAL', 'PAY_PER_VISIT', 'FAMILY');--> statement-breakpoint
CREATE TYPE "public"."pt_session_status" AS ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');--> statement-breakpoint
CREATE TYPE "public"."referral_source" AS ENUM('WALK_IN', 'ONLINE', 'REFERRAL', 'SOCIAL_MEDIA', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."registration_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('ADMIN', 'MANAGER', 'FRONT_DESK', 'TRAINER');--> statement-breakpoint
CREATE SEQUENCE "public"."invoice_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."member_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"check_in_at" timestamp DEFAULT now() NOT NULL,
	"check_out_at" timestamp,
	"method" "attendance_method" DEFAULT 'MANUAL' NOT NULL,
	"recorded_by" integer
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_user_id" integer,
	"action" varchar(150) NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" integer,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_schedule_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"status" "class_booking_status" DEFAULT 'BOOKED' NOT NULL,
	"booked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"capacity" integer
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"trainer_id" integer,
	"description" text,
	"capacity" integer DEFAULT 20 NOT NULL,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"trainer_id" integer NOT NULL,
	"pt_session_id" integer,
	"class_id" integer,
	"amount" numeric(10, 2) NOT NULL,
	"period_start" date,
	"period_end" date,
	"status" "commission_status" DEFAULT 'PENDING' NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communications" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"type" "communication_type" NOT NULL,
	"direction" "communication_direction" DEFAULT 'OUTBOUND' NOT NULL,
	"subject" varchar(250),
	"body" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"membership_id" integer NOT NULL,
	"file_name" varchar(300),
	"file_data_url" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"type" "document_type" NOT NULL,
	"file_name" varchar(300) NOT NULL,
	"file_data_url" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" "expense_category" NOT NULL,
	"description" text,
	"amount" numeric(10, 2) NOT NULL,
	"date" date NOT NULL,
	"recorded_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"goal_type" varchar(100) NOT NULL,
	"description" text,
	"target_value" numeric(10, 2),
	"current_value" numeric(10, 2),
	"unit" varchar(30),
	"target_date" date,
	"status" varchar(30) DEFAULT 'IN_PROGRESS' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_number" varchar(40) NOT NULL,
	"member_id" integer NOT NULL,
	"membership_id" integer,
	"subtotal" numeric(10, 2) NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"status" "invoice_status" DEFAULT 'UNPAID' NOT NULL,
	"line_items" jsonb NOT NULL,
	"issue_date" date NOT NULL,
	"due_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"tag" varchar(60) NOT NULL,
	"added_by" integer,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_code" varchar(20) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255),
	"phone" varchar(30),
	"dob" date,
	"gender" varchar(30),
	"address" text,
	"photo_url" text,
	"emergency_contact_name" varchar(200),
	"emergency_contact_phone" varchar(30),
	"emergency_contact_relation" varchar(100),
	"referral_source" "referral_source" DEFAULT 'WALK_IN',
	"status" "member_status" DEFAULT 'PENDING' NOT NULL,
	"family_group_id" integer,
	"password_hash" text,
	"login_email" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"membership_id" integer NOT NULL,
	"from_plan_id" integer,
	"to_plan_id" integer,
	"type" "membership_change_type" NOT NULL,
	"change_date" timestamp DEFAULT now() NOT NULL,
	"proration_amount" numeric(10, 2),
	"reason" text,
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "membership_freezes" (
	"id" serial PRIMARY KEY NOT NULL,
	"membership_id" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"reason" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"status" "membership_status" DEFAULT 'ACTIVE' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"next_due_date" date,
	"price_at_signup" numeric(10, 2) NOT NULL,
	"auto_renew" boolean DEFAULT true NOT NULL,
	"visits_remaining" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer,
	"channel" "notification_channel" NOT NULL,
	"type" "notification_type" NOT NULL,
	"subject" varchar(250),
	"body" text NOT NULL,
	"status" "notification_status" DEFAULT 'QUEUED' NOT NULL,
	"error" text,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"membership_id" integer,
	"invoice_id" integer,
	"amount" numeric(10, 2) NOT NULL,
	"method" "payment_method" DEFAULT 'CASH' NOT NULL,
	"status" "payment_status" DEFAULT 'COMPLETED' NOT NULL,
	"reference" varchar(120),
	"notes" text,
	"paid_at" timestamp DEFAULT now() NOT NULL,
	"recorded_by" integer
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"type" "plan_type" NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"billing_interval_months" integer DEFAULT 1 NOT NULL,
	"visits_included" integer,
	"family_max_members" integer,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pt_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"trainer_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"status" "pt_session_status" DEFAULT 'SCHEDULED' NOT NULL,
	"notes" text,
	"price" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"reason" text,
	"processed_by" integer,
	"processed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"requested_plan_id" integer,
	"status" "registration_status" DEFAULT 'PENDING' NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"review_notes" text,
	"submitted_by_staff" integer
);
--> statement-breakpoint
CREATE TABLE "trainers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"bio" text,
	"specialties" varchar(300),
	"commission_rate" numeric(5, 2) DEFAULT '0',
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'FRONT_DESK' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waivers" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"waiver_version" varchar(30) DEFAULT 'v1' NOT NULL,
	"waiver_text" text NOT NULL,
	"signed_name" varchar(200) NOT NULL,
	"signature_data_url" text,
	"signed_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" varchar(60)
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_bookings" ADD CONSTRAINT "class_bookings_class_schedule_id_class_schedules_id_fk" FOREIGN KEY ("class_schedule_id") REFERENCES "public"."class_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_bookings" ADD CONSTRAINT "class_bookings_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_schedules" ADD CONSTRAINT "class_schedules_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_pt_session_id_pt_sessions_id_fk" FOREIGN KEY ("pt_session_id") REFERENCES "public"."pt_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_tags" ADD CONSTRAINT "member_tags_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_tags" ADD CONSTRAINT "member_tags_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_changes" ADD CONSTRAINT "membership_changes_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_changes" ADD CONSTRAINT "membership_changes_from_plan_id_plans_id_fk" FOREIGN KEY ("from_plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_changes" ADD CONSTRAINT "membership_changes_to_plan_id_plans_id_fk" FOREIGN KEY ("to_plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_changes" ADD CONSTRAINT "membership_changes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_freezes" ADD CONSTRAINT "membership_freezes_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_freezes" ADD CONSTRAINT "membership_freezes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pt_sessions" ADD CONSTRAINT "pt_sessions_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pt_sessions" ADD CONSTRAINT "pt_sessions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_requested_plan_id_plans_id_fk" FOREIGN KEY ("requested_plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_submitted_by_staff_users_id_fk" FOREIGN KEY ("submitted_by_staff") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainers" ADD CONSTRAINT "trainers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waivers" ADD CONSTRAINT "waivers_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_member_idx" ON "attendance" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "attendance_checkin_idx" ON "attendance" USING btree ("check_in_at");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "class_booking_unique_idx" ON "class_bookings" USING btree ("class_schedule_id","member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_number_idx" ON "invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE UNIQUE INDEX "member_tag_unique_idx" ON "member_tags" USING btree ("member_id","tag");--> statement-breakpoint
CREATE UNIQUE INDEX "members_code_idx" ON "members" USING btree ("member_code");--> statement-breakpoint
CREATE INDEX "members_email_idx" ON "members" USING btree ("email");--> statement-breakpoint
CREATE INDEX "memberships_member_idx" ON "memberships" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "memberships_due_date_idx" ON "memberships" USING btree ("next_due_date");--> statement-breakpoint
CREATE INDEX "payments_member_idx" ON "payments" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "payments_paid_at_idx" ON "payments" USING btree ("paid_at");--> statement-breakpoint
CREATE UNIQUE INDEX "trainers_user_idx" ON "trainers" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");