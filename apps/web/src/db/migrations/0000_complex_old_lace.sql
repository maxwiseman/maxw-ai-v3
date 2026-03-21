CREATE TYPE "public"."grading_question_type" AS ENUM('multiple_choice', 'short_answer', 'true_false');--> statement-breakpoint
CREATE TYPE "public"."grading_session_status" AS ENUM('draft', 'answer_key_ready', 'processing', 'complete', 'error');--> statement-breakpoint
CREATE TYPE "public"."grading_split_mode" AS ENUM('fixed_pages');--> statement-breakpoint
CREATE TYPE "public"."canvas_content_type" AS ENUM('assignment', 'page', 'quiz', 'discussion');--> statement-breakpoint
CREATE TYPE "public"."date_type" AS ENUM('calendar', 'calendarEvening', 'anytime', 'someday');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"settings" jsonb DEFAULT '{"role":"student"}'::jsonb NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_metadata" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"user_id" text NOT NULL,
	"friendly_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chat_metadata_chat_id_unique" UNIQUE("chat_id")
);
--> statement-breakpoint
CREATE TABLE "grading_answer_key" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"question_number" integer NOT NULL,
	"question_type" "grading_question_type" NOT NULL,
	"correct_answer" text NOT NULL,
	"explanation" text,
	"points" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grading_result" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"student_index" integer NOT NULL,
	"student_name" text,
	"r2_key" text,
	"raw_ocr_text" text,
	"score" integer,
	"max_score" integer,
	"answers" jsonb,
	"graded_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "grading_session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"status" "grading_session_status" DEFAULT 'draft' NOT NULL,
	"blank_pdf_r2_key" text,
	"full_scan_r2_key" text,
	"pages_per_student" integer,
	"split_mode" "grading_split_mode" DEFAULT 'fixed_pages' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "container_session" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"sandbox_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "container_session_chat_id_unique" UNIQUE("chat_id")
);
--> statement-breakpoint
CREATE TABLE "memory" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"path" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sandbox_file" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"chat_id" text NOT NULL,
	"filename" text NOT NULL,
	"r2_key" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_set" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"createdAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "study_set_items" (
	"id" text PRIMARY KEY NOT NULL,
	"studySetId" text NOT NULL,
	"type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todo" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text,
	"checked" boolean DEFAULT false NOT NULL,
	"date_type" date_type DEFAULT 'anytime',
	"scheduled_date" timestamp,
	"due_date" timestamp,
	"sub_tasks" jsonb,
	"canvas_content_type" "canvas_content_type",
	"canvas_content_id" integer,
	"canvas_class_id" integer,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_metadata" ADD CONSTRAINT "chat_metadata_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grading_answer_key" ADD CONSTRAINT "grading_answer_key_session_id_grading_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."grading_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grading_result" ADD CONSTRAINT "grading_result_session_id_grading_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."grading_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grading_session" ADD CONSTRAINT "grading_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory" ADD CONSTRAINT "memory_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sandbox_file" ADD CONSTRAINT "sandbox_file_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_set" ADD CONSTRAINT "study_set_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_set_items" ADD CONSTRAINT "study_set_items_studySetId_study_set_id_fk" FOREIGN KEY ("studySetId") REFERENCES "public"."study_set"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todo" ADD CONSTRAINT "todo_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;