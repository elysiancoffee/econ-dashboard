ALTER TABLE "tasks" ADD COLUMN "recurrence" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "recurrence_parent_id" text;