CREATE TABLE "level_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"level" integer NOT NULL,
	"required_points" integer NOT NULL,
	"title" text NOT NULL,
	"color" text DEFAULT '#FFFFFF',
	"benefits" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "level_settings_level_unique" UNIQUE("level")
);
--> statement-breakpoint
CREATE TABLE "points_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"points" integer NOT NULL,
	"reason" text NOT NULL,
	"action" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "points" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "level" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "total_points" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "level_progress" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "points_history" ADD CONSTRAINT "points_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;