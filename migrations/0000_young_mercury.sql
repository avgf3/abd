CREATE TABLE "blocked_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip_address" text NOT NULL,
	"device_id" text NOT NULL,
	"user_id" integer NOT NULL,
	"reason" text NOT NULL,
	"blocked_at" timestamp NOT NULL,
	"blocked_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "friends" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"friend_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_id" integer,
	"receiver_id" integer,
	"content" text NOT NULL,
	"message_type" text DEFAULT 'text' NOT NULL,
	"is_private" boolean DEFAULT false,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"data" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text,
	"user_type" text DEFAULT 'guest' NOT NULL,
	"role" text DEFAULT 'guest' NOT NULL,
	"profile_image" text,
	"profile_banner" text,
	"profile_background_color" text DEFAULT '#3c0d0d',
	"status" text,
	"gender" text,
	"age" integer,
	"country" text,
	"relation" text,
	"bio" text,
	"is_online" boolean DEFAULT false,
	"is_hidden" boolean DEFAULT false,
	"last_seen" timestamp,
	"join_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"is_muted" boolean DEFAULT false,
	"mute_expiry" timestamp,
	"is_banned" boolean DEFAULT false,
	"ban_expiry" timestamp,
	"is_blocked" boolean DEFAULT false,
	"ip_address" varchar(45),
	"device_id" varchar(100),
	"ignored_users" text DEFAULT '[]',
	"username_color" text DEFAULT '#FFFFFF',
	"user_theme" text DEFAULT 'default',
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "friends" ADD CONSTRAINT "friends_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friends" ADD CONSTRAINT "friends_friend_id_users_id_fk" FOREIGN KEY ("friend_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;