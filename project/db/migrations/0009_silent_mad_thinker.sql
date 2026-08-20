CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'project_invitation';--> statement-breakpoint
CREATE TABLE "project_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"inviter_id" uuid NOT NULL,
	"invitee_id" uuid NOT NULL,
	"role" "project_role" DEFAULT 'developer' NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "project_invitation" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_invitee_id_users_id_fk" FOREIGN KEY ("invitee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_invitations_project_id_idx" ON "project_invitations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_invitations_invitee_id_idx" ON "project_invitations" USING btree ("invitee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_invitations_project_invitee_unique" ON "project_invitations" USING btree ("project_id","invitee_id");