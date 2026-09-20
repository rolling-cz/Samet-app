CREATE TABLE "answer_input_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"answer_id" uuid NOT NULL,
	"answer_option_id" uuid NOT NULL,
	"input_key" text NOT NULL,
	"value" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "answer_input_values_unique" UNIQUE("run_id","answer_id","answer_option_id","input_key")
);
--> statement-breakpoint
ALTER TABLE "dice_rolls" DROP CONSTRAINT "dice_rolls_unique";--> statement-breakpoint
ALTER TABLE "dice_rolls" DROP CONSTRAINT "dice_rolls_chapter_fk";
--> statement-breakpoint
ALTER TABLE "dice_rolls" DROP CONSTRAINT "dice_rolls_character_fk";
--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "source" "state_source" DEFAULT 'initial' NOT NULL;--> statement-breakpoint
ALTER TABLE "answer_input_values" ADD CONSTRAINT "answer_input_values_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_input_values" ADD CONSTRAINT "answer_input_values_answer_fk" FOREIGN KEY ("run_id","answer_id") REFERENCES "public"."answers"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_input_values" ADD CONSTRAINT "answer_input_values_option_fk" FOREIGN KEY ("run_id","answer_option_id") REFERENCES "public"."answer_options"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dice_rolls" DROP COLUMN "chapter_id";--> statement-breakpoint
ALTER TABLE "dice_rolls" DROP COLUMN "character_id";--> statement-breakpoint
ALTER TABLE "dice_rolls" ADD CONSTRAINT "dice_rolls_unique" UNIQUE("run_id","block_variation_id","occurrence");