CREATE TABLE "room_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"room_id" text NOT NULL,
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"created_by" integer NOT NULL,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"is_broadcast" boolean DEFAULT false,
	"host_id" integer,
	"speakers" text DEFAULT '[]',
	"mic_queue" text DEFAULT '[]',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wall_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"username" text NOT NULL,
	"user_role" text NOT NULL,
	"content" text,
	"image_url" text,
	"type" text DEFAULT 'public' NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"user_profile_image" text,
	"username_color" text DEFAULT '#FFFFFF',
	"total_likes" integer DEFAULT 0,
	"total_dislikes" integer DEFAULT 0,
	"total_hearts" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wall_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"username" text NOT NULL,
	"type" text NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "room_users" ADD CONSTRAINT "room_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_users" ADD CONSTRAINT "room_users_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wall_posts" ADD CONSTRAINT "wall_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wall_reactions" ADD CONSTRAINT "wall_reactions_post_id_wall_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."wall_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wall_reactions" ADD CONSTRAINT "wall_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;