CREATE TABLE "boards" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"allowed_roles" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "logs" (
	"id" text PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"username" text NOT NULL,
	"action" text NOT NULL,
	"timestamp" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"board_id" text NOT NULL,
	"can_create_task" boolean DEFAULT false NOT NULL,
	"can_edit_task" boolean DEFAULT false NOT NULL,
	"can_delete_task" boolean DEFAULT false NOT NULL,
	"can_view_board" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "staff_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"board_id" text NOT NULL,
	"progress_percentage" integer DEFAULT 0 NOT NULL,
	"total_tasks_completed" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"amount" integer NOT NULL,
	"notes" text,
	"timestamp" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"board_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"assigned_user_id" text NOT NULL,
	"priority" text NOT NULL,
	"status" text NOT NULL,
	"due_date" text NOT NULL,
	"comments_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"isOnline" boolean DEFAULT false NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_uid_users_id_fk" FOREIGN KEY ("uid") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_progress" ADD CONSTRAINT "staff_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_progress" ADD CONSTRAINT "staff_progress_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_roles_name_fk" FOREIGN KEY ("role") REFERENCES "public"."roles"("name") ON DELETE cascade ON UPDATE no action;