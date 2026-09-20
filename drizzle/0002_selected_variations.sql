CREATE TABLE "selected_variations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"computation_id" uuid NOT NULL,
	"block_id" uuid NOT NULL,
	"block_variation_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "selected_variations_unique" UNIQUE("run_id","computation_id","block_id")
);
--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "condition_variation_id" uuid;--> statement-breakpoint
ALTER TABLE "selected_variations" ADD CONSTRAINT "selected_variations_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selected_variations" ADD CONSTRAINT "selected_variations_computation_fk" FOREIGN KEY ("run_id","computation_id") REFERENCES "public"."computations"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selected_variations" ADD CONSTRAINT "selected_variations_block_fk" FOREIGN KEY ("run_id","block_id") REFERENCES "public"."content_blocks"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selected_variations" ADD CONSTRAINT "selected_variations_variation_fk" FOREIGN KEY ("run_id","block_id","block_variation_id") REFERENCES "public"."block_variations"("run_id","block_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_condition_variation_fk" FOREIGN KEY ("run_id","condition_variation_id") REFERENCES "public"."block_variations"("run_id","id") ON DELETE restrict ON UPDATE no action;