CREATE TABLE "shortcuts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "boards" ADD COLUMN "allowed_users" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "shortcuts" ADD CONSTRAINT "shortcuts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;