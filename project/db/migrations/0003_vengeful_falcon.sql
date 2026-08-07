CREATE TYPE "public"."activity_type" AS ENUM('task_created', 'title_changed', 'description_changed', 'status_changed', 'priority_changed', 'assignee_changed', 'due_date_changed', 'label_added', 'label_removed', 'comment_added', 'comment_deleted');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "activity_type" NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_task_id_idx" ON "activities" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "activities_user_id_idx" ON "activities" USING btree ("user_id");