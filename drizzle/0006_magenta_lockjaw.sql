CREATE TYPE "public"."resource_scope" AS ENUM('private', 'household');--> statement-breakpoint
CREATE TYPE "public"."resource_target" AS ENUM('smerovany', 'osobni', 'domacnost');--> statement-breakpoint
CREATE TABLE "character_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"character_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"default_value" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "character_resources_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "character_resources_unique" UNIQUE("run_id","character_id","resource_id"),
	CONSTRAINT "character_resources_external_key" UNIQUE("run_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"scope" "resource_scope" DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resources_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "resources_run_key_key" UNIQUE("run_id","key")
);
--> statement-breakpoint
CREATE TABLE "effect_inputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"effect_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"input_key" text NOT NULL,
	"sign" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "effect_inputs_unique" UNIQUE("run_id","effect_id","ordinal"),
	CONSTRAINT "effect_inputs_sign" CHECK ("effect_inputs"."sign" in (1, -1))
);
--> statement-breakpoint
CREATE TABLE "character_resource_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"chapter_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"value" integer NOT NULL,
	"source" "state_source" NOT NULL,
	"computation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "character_resource_values_unique" UNIQUE NULLS NOT DISTINCT("run_id","chapter_id","character_id","resource_id","computation_id")
);
--> statement-breakpoint
CREATE TABLE "household_resource_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"chapter_id" uuid NOT NULL,
	"household_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"value" integer NOT NULL,
	"source" "state_source" NOT NULL,
	"computation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "household_resource_values_unique" UNIQUE NULLS NOT DISTINCT("run_id","chapter_id","household_id","resource_id","computation_id")
);
--> statement-breakpoint
ALTER TABLE "flags" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "scale_bands" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rule_conditions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rules" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "character_flags" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "household_scale_values" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "flags" CASCADE;--> statement-breakpoint
DROP TABLE "scale_bands" CASCADE;--> statement-breakpoint
DROP TABLE "rule_conditions" CASCADE;--> statement-breakpoint
DROP TABLE "rules" CASCADE;--> statement-breakpoint
DROP TABLE "character_flags" CASCADE;--> statement-breakpoint
DROP TABLE "household_scale_values" CASCADE;--> statement-breakpoint
ALTER TABLE "dice_rolls" DROP CONSTRAINT "dice_rolls_unique";--> statement-breakpoint
ALTER TABLE "block_variations" DROP CONSTRAINT "block_variations_block_priority_key";--> statement-breakpoint
ALTER TABLE "character_scales" DROP CONSTRAINT "character_scales_initial_range";--> statement-breakpoint
ALTER TABLE "scales" DROP CONSTRAINT "scales_range_sane";--> statement-breakpoint
ALTER TABLE "scales" DROP CONSTRAINT "scales_range_within_1_10";--> statement-breakpoint
ALTER TABLE "scales" DROP CONSTRAINT "scales_household_strategies";--> statement-breakpoint
ALTER TABLE "questions" DROP CONSTRAINT "questions_paired_needs_options";--> statement-breakpoint
ALTER TABLE "questions" DROP CONSTRAINT "questions_scale_direct_needs_scale";--> statement-breakpoint
ALTER TABLE "effects" DROP CONSTRAINT "effects_exactly_one_owner";--> statement-breakpoint
ALTER TABLE "effects" DROP CONSTRAINT "effects_scale_value_range";--> statement-breakpoint
ALTER TABLE "character_scale_values" DROP CONSTRAINT "character_scale_values_range";--> statement-breakpoint
ALTER TABLE "block_variations" DROP CONSTRAINT "block_variations_priority_positive";--> statement-breakpoint
ALTER TABLE "questions" DROP CONSTRAINT "questions_scale_fk";
--> statement-breakpoint
ALTER TABLE "effects" DROP CONSTRAINT "effects_rule_fk";
--> statement-breakpoint
ALTER TABLE "effects" DROP CONSTRAINT "effects_band_fk";
--> statement-breakpoint
ALTER TABLE "effects" DROP CONSTRAINT "effects_flag_fk";
--> statement-breakpoint
ALTER TABLE "character_scale_values" DROP CONSTRAINT "character_scale_values_band_fk";
--> statement-breakpoint
ALTER TABLE "dice_rolls" DROP CONSTRAINT "dice_rolls_rule_fk";
--> statement-breakpoint
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_rule_fk";
--> statement-breakpoint
ALTER TABLE "effects" ALTER COLUMN "kind" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."effect_kind";--> statement-breakpoint
CREATE TYPE "public"."effect_kind" AS ENUM('zmena_skaly', 'nastaveni_skaly', 'zmena_zdroje', 'nastaveni_zdroje', 'blok', 'clenstvi', 'vedeni', 'domacnost_slouceni', 'domacnost_rozdeleni');--> statement-breakpoint
ALTER TABLE "effects" ALTER COLUMN "kind" SET DATA TYPE "public"."effect_kind" USING "kind"::"public"."effect_kind";--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."question_type";--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('bool', 'single', 'multi', 'poll', 'poll-answer', 'scale_direct', 'resource_direct');--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "type" SET DATA TYPE "public"."question_type" USING "type"::"public"."question_type";--> statement-breakpoint
ALTER TABLE "templates" ALTER COLUMN "kind" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."template_kind";--> statement-breakpoint
CREATE TYPE "public"."template_kind" AS ENUM('postava', 'skupina', 'dotaznik');--> statement-breakpoint
ALTER TABLE "templates" ALTER COLUMN "kind" SET DATA TYPE "public"."template_kind" USING "kind"::"public"."template_kind";--> statement-breakpoint
DROP INDEX "templates_singleton";--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "character_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "ordinal" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "text" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "effects" ALTER COLUMN "answer_option_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "block_variations" ALTER COLUMN "priority" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "block_variations" ALTER COLUMN "condition_expr" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "content_blocks" ALTER COLUMN "character_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "character_scales" ADD COLUMN "min_value" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "character_scales" ADD COLUMN "max_value" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "character_scales" ADD COLUMN "default_value" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "poll_question_id" uuid;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "is_private" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "target_scale_id" uuid;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "target_resource_id" uuid;--> statement-breakpoint
ALTER TABLE "effects" ADD COLUMN "resource_id" uuid;--> statement-breakpoint
ALTER TABLE "effects" ADD COLUMN "resource_delta" integer;--> statement-breakpoint
ALTER TABLE "effects" ADD COLUMN "resource_set_value" integer;--> statement-breakpoint
ALTER TABLE "effects" ADD COLUMN "resource_target" "resource_target";--> statement-breakpoint
ALTER TABLE "effects" ADD COLUMN "household_external_id" text;--> statement-breakpoint
ALTER TABLE "dice_rolls" ADD COLUMN "block_variation_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "dice_rolls" ADD COLUMN "occurrence" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "block_variations" ADD COLUMN "ordinal" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "effect_id" uuid;--> statement-breakpoint
ALTER TABLE "character_resources" ADD CONSTRAINT "character_resources_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_resources" ADD CONSTRAINT "character_resources_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_resources" ADD CONSTRAINT "character_resources_resource_fk" FOREIGN KEY ("run_id","resource_id") REFERENCES "public"."resources"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effect_inputs" ADD CONSTRAINT "effect_inputs_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effect_inputs" ADD CONSTRAINT "effect_inputs_effect_fk" FOREIGN KEY ("run_id","effect_id") REFERENCES "public"."effects"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_resource_values" ADD CONSTRAINT "character_resource_values_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_resource_values" ADD CONSTRAINT "character_resource_values_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_resource_values" ADD CONSTRAINT "character_resource_values_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_resource_values" ADD CONSTRAINT "character_resource_values_resource_fk" FOREIGN KEY ("run_id","resource_id") REFERENCES "public"."resources"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_resource_values" ADD CONSTRAINT "character_resource_values_computation_fk" FOREIGN KEY ("run_id","computation_id") REFERENCES "public"."computations"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_resource_values" ADD CONSTRAINT "household_resource_values_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_resource_values" ADD CONSTRAINT "household_resource_values_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_resource_values" ADD CONSTRAINT "household_resource_values_household_fk" FOREIGN KEY ("run_id","household_id") REFERENCES "public"."households"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_resource_values" ADD CONSTRAINT "household_resource_values_resource_fk" FOREIGN KEY ("run_id","resource_id") REFERENCES "public"."resources"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_resource_values" ADD CONSTRAINT "household_resource_values_computation_fk" FOREIGN KEY ("run_id","computation_id") REFERENCES "public"."computations"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_poll_fk" FOREIGN KEY ("run_id","poll_question_id") REFERENCES "public"."questions"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_target_scale_fk" FOREIGN KEY ("run_id","target_scale_id") REFERENCES "public"."scales"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_target_resource_fk" FOREIGN KEY ("run_id","target_resource_id") REFERENCES "public"."resources"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "effects_resource_fk" FOREIGN KEY ("run_id","resource_id") REFERENCES "public"."resources"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dice_rolls" ADD CONSTRAINT "dice_rolls_variation_fk" FOREIGN KEY ("run_id","block_variation_id") REFERENCES "public"."block_variations"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_group_fk" FOREIGN KEY ("run_id","group_id") REFERENCES "public"."groups"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_effect_fk" FOREIGN KEY ("run_id","effect_id") REFERENCES "public"."effects"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "block_variations_block_priority_key" ON "block_variations" USING btree ("run_id","block_id","priority") WHERE "block_variations"."priority" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "templates_singleton" ON "templates" USING btree ("run_id","chapter_id","kind") WHERE "templates"."kind" = 'dotaznik';--> statement-breakpoint
ALTER TABLE "characters" DROP COLUMN "template_external_id";--> statement-breakpoint
ALTER TABLE "character_scales" DROP COLUMN "initial_value";--> statement-breakpoint
ALTER TABLE "scales" DROP COLUMN "min_value";--> statement-breakpoint
ALTER TABLE "scales" DROP COLUMN "max_value";--> statement-breakpoint
ALTER TABLE "scales" DROP COLUMN "scope";--> statement-breakpoint
ALTER TABLE "scales" DROP COLUMN "merge_strategy";--> statement-breakpoint
ALTER TABLE "scales" DROP COLUMN "split_strategy";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "is_paired";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "scale_id";--> statement-breakpoint
ALTER TABLE "effects" DROP COLUMN "rule_id";--> statement-breakpoint
ALTER TABLE "effects" DROP COLUMN "band_id";--> statement-breakpoint
ALTER TABLE "effects" DROP COLUMN "uses_dice_value";--> statement-breakpoint
ALTER TABLE "effects" DROP COLUMN "flag_id";--> statement-breakpoint
ALTER TABLE "effects" DROP COLUMN "flag_value";--> statement-breakpoint
ALTER TABLE "effects" DROP COLUMN "tag_code";--> statement-breakpoint
ALTER TABLE "effects" DROP COLUMN "tag_note";--> statement-breakpoint
ALTER TABLE "character_scale_values" DROP COLUMN "band_id";--> statement-breakpoint
ALTER TABLE "dice_rolls" DROP COLUMN "rule_id";--> statement-breakpoint
ALTER TABLE "templates" DROP COLUMN "external_id";--> statement-breakpoint
ALTER TABLE "audit_log" DROP COLUMN "rule_id";--> statement-breakpoint
ALTER TABLE "dice_rolls" ADD CONSTRAINT "dice_rolls_unique" UNIQUE("run_id","chapter_id","character_id","block_variation_id","occurrence");--> statement-breakpoint
ALTER TABLE "block_variations" ADD CONSTRAINT "block_variations_block_ordinal_key" UNIQUE("run_id","block_id","ordinal");--> statement-breakpoint
ALTER TABLE "character_scales" ADD CONSTRAINT "character_scales_range_sane" CHECK ("character_scales"."min_value" < "character_scales"."max_value");--> statement-breakpoint
ALTER TABLE "character_scales" ADD CONSTRAINT "character_scales_default_in_range" CHECK ("character_scales"."default_value" between "character_scales"."min_value" and "character_scales"."max_value");--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_poll_has_no_character" CHECK (("questions"."type" = 'poll') = ("questions"."character_id" is null and "questions"."ordinal" is null));--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_poll_answer_needs_poll" CHECK (("questions"."type" = 'poll-answer') = ("questions"."poll_question_id" is not null));--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_resource_direct_needs_resource" CHECK (("questions"."type" = 'resource_direct') = ("questions"."target_resource_id" is not null));--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_scale_direct_needs_scale" CHECK (("questions"."type" = 'scale_direct') = ("questions"."target_scale_id" is not null));--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "effects_target_only_on_resources" CHECK (("effects"."kind" in ('zmena_zdroje', 'nastaveni_zdroje')) = ("effects"."resource_target" is not null));--> statement-breakpoint
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_exactly_one_owner" CHECK (("content_blocks"."character_id" is not null) <> ("content_blocks"."group_id" is not null));--> statement-breakpoint
DROP TYPE "public"."condition_connector";--> statement-breakpoint
DROP TYPE "public"."condition_operator";--> statement-breakpoint
DROP TYPE "public"."condition_subject";--> statement-breakpoint
DROP TYPE "public"."merge_strategy";--> statement-breakpoint
DROP TYPE "public"."scale_scope";--> statement-breakpoint
DROP TYPE "public"."split_strategy";