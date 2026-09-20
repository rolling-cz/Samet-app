CREATE TYPE "public"."cascade_decision" AS ENUM('prepocitat', 'ponechat');--> statement-breakpoint
CREATE TYPE "public"."chapter_status" AS ENUM('rozpracovana', 'spocitana', 'vydana');--> statement-breakpoint
CREATE TYPE "public"."computation_kind" AS ENUM('prepocet', 'rucni_uprava');--> statement-breakpoint
CREATE TYPE "public"."computation_status" AS ENUM('navrh', 'potvrzena');--> statement-breakpoint
CREATE TYPE "public"."effect_kind" AS ENUM('zmena_skaly', 'nastaveni_skaly', 'zmena_zdroje', 'nastaveni_zdroje', 'blok', 'domacnost_vznik', 'domacnost_zanik');--> statement-breakpoint
CREATE TYPE "public"."question_source" AS ENUM('hrac', 'org');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('bool', 'single', 'multi', 'poll', 'poll-answer', 'scale_direct', 'resource_direct');--> statement-breakpoint
CREATE TYPE "public"."resource_scope" AS ENUM('private', 'household');--> statement-breakpoint
CREATE TYPE "public"."resource_target" AS ENUM('smerovany', 'osobni', 'domacnost');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('zalozen', 'aktivni', 'archivovan');--> statement-breakpoint
CREATE TYPE "public"."state_source" AS ENUM('pocatecni', 'prepocet', 'rucni');--> statement-breakpoint
CREATE TYPE "public"."template_kind" AS ENUM('postava', 'skupina', 'dotaznik');--> statement-breakpoint
CREATE TYPE "public"."upload_kind" AS ENUM('konfigurace', 'sablona');--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"number" integer NOT NULL,
	"status" "chapter_status" DEFAULT 'rozpracovana' NOT NULL,
	"released_at" timestamp with time zone,
	"released_by" text,
	"is_touched" boolean DEFAULT false NOT NULL,
	"touched_at" timestamp with time zone,
	"touched_reason" text,
	"cascade_decision" "cascade_decision",
	"cascade_decided_at" timestamp with time zone,
	"cascade_decided_by" text,
	"diverges_from_released" boolean DEFAULT false NOT NULL,
	"divergence_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chapters_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "chapters_run_number_key" UNIQUE("run_id","number"),
	CONSTRAINT "chapters_number_range" CHECK ("chapters"."number" between 1 and 3)
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" text PRIMARY KEY NOT NULL,
	"start_date" text NOT NULL,
	"letter" text NOT NULL,
	"label" text,
	"status" "run_status" DEFAULT 'zalozen' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	CONSTRAINT "runs_id_format" CHECK ("runs"."id" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}_[A-Z]$'),
	CONSTRAINT "runs_letter_format" CHECK ("runs"."letter" ~ '^[A-Z]$')
);
--> statement-breakpoint
CREATE TABLE "uploaded_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"kind" "upload_kind" NOT NULL,
	"filename" text NOT NULL,
	"content" "bytea" NOT NULL,
	"import_report" jsonb,
	"note" text,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	CONSTRAINT "uploaded_files_run_id_key" UNIQUE("run_id","id")
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"external_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"birth_year" integer,
	"default_household_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "characters_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "characters_run_external_key" UNIQUE("run_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "groups_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "groups_run_external_key" UNIQUE("run_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"external_id" text NOT NULL,
	"label" text,
	"created_in_chapter_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "households_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "households_run_external_key" UNIQUE("run_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "character_scales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"character_id" uuid NOT NULL,
	"scale_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"min_value" integer NOT NULL,
	"max_value" integer NOT NULL,
	"default_value" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "character_scales_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "character_scales_unique" UNIQUE("run_id","character_id","scale_id"),
	CONSTRAINT "character_scales_external_key" UNIQUE("run_id","external_id"),
	CONSTRAINT "character_scales_range_sane" CHECK ("character_scales"."min_value" < "character_scales"."max_value"),
	CONSTRAINT "character_scales_default_in_range" CHECK ("character_scales"."default_value" between "character_scales"."min_value" and "character_scales"."max_value")
);
--> statement-breakpoint
CREATE TABLE "scales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scales_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "scales_run_key_key" UNIQUE("run_id","key")
);
--> statement-breakpoint
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
CREATE TABLE "household_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"household_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"default_value" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "household_resources_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "household_resources_unique" UNIQUE("run_id","household_id","resource_id"),
	CONSTRAINT "household_resources_external_key" UNIQUE("run_id","external_id")
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
CREATE TABLE "answer_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"external_id" text NOT NULL,
	"question_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"label" text NOT NULL,
	"referenced_character_id" uuid,
	"is_other" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "answer_options_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "answer_options_run_external_key" UNIQUE("run_id","external_id"),
	CONSTRAINT "answer_options_question_ordinal_key" UNIQUE("run_id","question_id","ordinal")
);
--> statement-breakpoint
CREATE TABLE "answer_selected_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"answer_id" uuid NOT NULL,
	"answer_option_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "answer_selected_options_unique" UNIQUE("run_id","answer_id","answer_option_id")
);
--> statement-breakpoint
CREATE TABLE "answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"chapter_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"bool_value" boolean,
	"numeric_value" integer,
	"text_value" text,
	"filled_by_org" boolean DEFAULT false NOT NULL,
	"answered_by" text NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "answers_unique" UNIQUE("run_id","chapter_id","character_id","question_id"),
	CONSTRAINT "answers_run_id_key" UNIQUE("run_id","id")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"external_id" text NOT NULL,
	"chapter_id" uuid NOT NULL,
	"character_id" uuid,
	"ordinal" integer,
	"type" "question_type" NOT NULL,
	"source" "question_source" DEFAULT 'hrac' NOT NULL,
	"poll_question_id" uuid,
	"is_private" boolean DEFAULT false NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"help_text" text,
	"target_scale_id" uuid,
	"target_resource_id" uuid,
	"allow_other" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "questions_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "questions_run_external_key" UNIQUE("run_id","external_id"),
	CONSTRAINT "questions_character_ordinal_key" UNIQUE("run_id","chapter_id","character_id","ordinal"),
	CONSTRAINT "questions_poll_has_no_character" CHECK (("questions"."type" = 'poll') = ("questions"."character_id" is null and "questions"."ordinal" is null)),
	CONSTRAINT "questions_poll_answer_needs_poll" CHECK (("questions"."type" = 'poll-answer') = ("questions"."poll_question_id" is not null)),
	CONSTRAINT "questions_scale_direct_needs_scale" CHECK (("questions"."type" = 'scale_direct') = ("questions"."target_scale_id" is not null)),
	CONSTRAINT "questions_resource_direct_needs_resource" CHECK (("questions"."type" = 'resource_direct') = ("questions"."target_resource_id" is not null))
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
CREATE TABLE "effects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"answer_option_id" uuid NOT NULL,
	"ordinal" integer DEFAULT 0 NOT NULL,
	"external_id" text NOT NULL,
	"kind" "effect_kind" NOT NULL,
	"weight" numeric(8, 3) DEFAULT '1' NOT NULL,
	"character_id" uuid,
	"scale_id" uuid,
	"scale_delta" integer,
	"scale_set_value" integer,
	"resource_id" uuid,
	"resource_delta" integer,
	"resource_set_value" integer,
	"resource_target" "resource_target",
	"household_external_id" text,
	"block_external_id" text,
	"related_character_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "effects_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "effects_run_external_key" UNIQUE("run_id","external_id"),
	CONSTRAINT "effects_household_needs_two" CHECK ("effects"."kind" not in ('domacnost_vznik', 'domacnost_zanik')
          or ("effects"."character_id" is not null and "effects"."related_character_id" is not null)),
	CONSTRAINT "effects_target_only_on_resources" CHECK (("effects"."kind" in ('zmena_zdroje', 'nastaveni_zdroje')) = ("effects"."resource_target" is not null))
);
--> statement-breakpoint
CREATE TABLE "computations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"chapter_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"kind" "computation_kind" DEFAULT 'prepocet' NOT NULL,
	"status" "computation_status" DEFAULT 'navrh' NOT NULL,
	"parent_computation_id" uuid,
	"config_upload_id" uuid NOT NULL,
	"engine_version" text NOT NULL,
	"input_hash" text NOT NULL,
	"result_json" jsonb NOT NULL,
	"trace_json" jsonb NOT NULL,
	"conflicts_json" jsonb,
	"reason" text,
	"is_released" boolean DEFAULT false NOT NULL,
	"confirmed_at" timestamp with time zone,
	"confirmed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	CONSTRAINT "computations_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "computations_chapter_version_key" UNIQUE("run_id","chapter_id","version"),
	CONSTRAINT "computations_version_positive" CHECK ("computations"."version" >= 1),
	CONSTRAINT "computations_manual_has_parent" CHECK ("computations"."kind" <> 'rucni_uprava' or "computations"."parent_computation_id" is not null)
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
CREATE TABLE "character_scale_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"chapter_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"scale_id" uuid NOT NULL,
	"value" integer NOT NULL,
	"raw_value" integer,
	"was_clamped" boolean DEFAULT false NOT NULL,
	"source" "state_source" NOT NULL,
	"computation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "character_scale_values_unique" UNIQUE NULLS NOT DISTINCT("run_id","chapter_id","character_id","scale_id","computation_id"),
	CONSTRAINT "character_scale_values_clamp_consistency" CHECK (("character_scale_values"."was_clamped" = false) or ("character_scale_values"."raw_value" is not null and "character_scale_values"."raw_value" <> "character_scale_values"."value"))
);
--> statement-breakpoint
CREATE TABLE "character_variables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"chapter_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"source" "state_source" NOT NULL,
	"computation_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "character_variables_unique" UNIQUE NULLS NOT DISTINCT("run_id","chapter_id","character_id","key","computation_id"),
	CONSTRAINT "character_variables_key_format" CHECK ("character_variables"."key" ~ '^[A-Z0-9_]+$')
);
--> statement-breakpoint
CREATE TABLE "household_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"chapter_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"household_id" uuid NOT NULL,
	"source" "state_source" NOT NULL,
	"computation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "household_memberships_one_per_character" UNIQUE NULLS NOT DISTINCT("run_id","chapter_id","character_id","computation_id")
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
CREATE TABLE "dice_rolls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"chapter_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"block_variation_id" uuid NOT NULL,
	"occurrence" integer DEFAULT 0 NOT NULL,
	"sides" integer NOT NULL,
	"value" integer NOT NULL,
	"previous_value" integer,
	"is_manual_override" boolean DEFAULT false NOT NULL,
	"reroll_count" integer DEFAULT 0 NOT NULL,
	"rolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rolled_by" text NOT NULL,
	"reason" text,
	CONSTRAINT "dice_rolls_unique" UNIQUE("run_id","chapter_id","character_id","block_variation_id","occurrence"),
	CONSTRAINT "dice_rolls_value_in_range" CHECK ("dice_rolls"."value" between 1 and "dice_rolls"."sides"),
	CONSTRAINT "dice_rolls_sides_sane" CHECK ("dice_rolls"."sides" >= 2)
);
--> statement-breakpoint
CREATE TABLE "block_variations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"external_id" text NOT NULL,
	"block_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"priority" integer,
	"description" text,
	"text" text DEFAULT '' NOT NULL,
	"condition_expr" text DEFAULT '' NOT NULL,
	"condition_refs" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "block_variations_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "block_variations_run_external_key" UNIQUE("run_id","external_id"),
	CONSTRAINT "block_variations_block_ordinal_key" UNIQUE("run_id","block_id","ordinal")
);
--> statement-breakpoint
CREATE TABLE "content_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"external_id" text NOT NULL,
	"chapter_id" uuid NOT NULL,
	"character_id" uuid,
	"group_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_blocks_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "content_blocks_run_external_key" UNIQUE("run_id","external_id"),
	CONSTRAINT "content_blocks_exactly_one_owner" CHECK (("content_blocks"."character_id" is not null) <> ("content_blocks"."group_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"chapter_id" uuid NOT NULL,
	"kind" "template_kind" NOT NULL,
	"character_id" uuid,
	"group_id" uuid,
	"name" text NOT NULL,
	"source_filename" text NOT NULL,
	"markdown" text NOT NULL,
	"parsed_blocks" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	CONSTRAINT "templates_run_id_key" UNIQUE("run_id","id"),
	CONSTRAINT "templates_character_key" UNIQUE("run_id","chapter_id","character_id"),
	CONSTRAINT "templates_group_key" UNIQUE("run_id","chapter_id","group_id"),
	CONSTRAINT "templates_target_matches_kind" CHECK (case "templates"."kind"
            when 'postava' then "templates"."character_id" is not null and "templates"."group_id" is null
            when 'skupina' then "templates"."group_id" is not null and "templates"."character_id" is null
            else "templates"."character_id" is null and "templates"."group_id" is null
          end)
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"chapter_id" uuid,
	"action" text NOT NULL,
	"entity_kind" text NOT NULL,
	"entity_id" text,
	"summary" text,
	"value_before" jsonb,
	"value_after" jsonb,
	"effect_id" uuid,
	"computation_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"author" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_default_household_fk" FOREIGN KEY ("run_id","default_household_id") REFERENCES "public"."households"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "households" ADD CONSTRAINT "households_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "households" ADD CONSTRAINT "households_chapter_fk" FOREIGN KEY ("run_id","created_in_chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_scales" ADD CONSTRAINT "character_scales_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_scales" ADD CONSTRAINT "character_scales_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_scales" ADD CONSTRAINT "character_scales_scale_fk" FOREIGN KEY ("run_id","scale_id") REFERENCES "public"."scales"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scales" ADD CONSTRAINT "scales_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_resources" ADD CONSTRAINT "character_resources_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_resources" ADD CONSTRAINT "character_resources_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_resources" ADD CONSTRAINT "character_resources_resource_fk" FOREIGN KEY ("run_id","resource_id") REFERENCES "public"."resources"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_resources" ADD CONSTRAINT "household_resources_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_resources" ADD CONSTRAINT "household_resources_household_fk" FOREIGN KEY ("run_id","household_id") REFERENCES "public"."households"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_resources" ADD CONSTRAINT "household_resources_resource_fk" FOREIGN KEY ("run_id","resource_id") REFERENCES "public"."resources"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_options" ADD CONSTRAINT "answer_options_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_options" ADD CONSTRAINT "answer_options_question_fk" FOREIGN KEY ("run_id","question_id") REFERENCES "public"."questions"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_options" ADD CONSTRAINT "answer_options_referenced_character_fk" FOREIGN KEY ("run_id","referenced_character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_selected_options" ADD CONSTRAINT "answer_selected_options_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_selected_options" ADD CONSTRAINT "answer_selected_options_answer_fk" FOREIGN KEY ("run_id","answer_id") REFERENCES "public"."answers"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_selected_options" ADD CONSTRAINT "answer_selected_options_option_fk" FOREIGN KEY ("run_id","answer_option_id") REFERENCES "public"."answer_options"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_fk" FOREIGN KEY ("run_id","question_id") REFERENCES "public"."questions"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_poll_fk" FOREIGN KEY ("run_id","poll_question_id") REFERENCES "public"."questions"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_target_scale_fk" FOREIGN KEY ("run_id","target_scale_id") REFERENCES "public"."scales"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_target_resource_fk" FOREIGN KEY ("run_id","target_resource_id") REFERENCES "public"."resources"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effect_inputs" ADD CONSTRAINT "effect_inputs_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effect_inputs" ADD CONSTRAINT "effect_inputs_effect_fk" FOREIGN KEY ("run_id","effect_id") REFERENCES "public"."effects"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "effects_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "effects_option_fk" FOREIGN KEY ("run_id","answer_option_id") REFERENCES "public"."answer_options"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "effects_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "effects_related_character_fk" FOREIGN KEY ("run_id","related_character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "effects_scale_fk" FOREIGN KEY ("run_id","scale_id") REFERENCES "public"."scales"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "effects_resource_fk" FOREIGN KEY ("run_id","resource_id") REFERENCES "public"."resources"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "computations" ADD CONSTRAINT "computations_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "computations" ADD CONSTRAINT "computations_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "computations" ADD CONSTRAINT "computations_parent_fk" FOREIGN KEY ("run_id","parent_computation_id") REFERENCES "public"."computations"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "computations" ADD CONSTRAINT "computations_config_upload_fk" FOREIGN KEY ("run_id","config_upload_id") REFERENCES "public"."uploaded_files"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_resource_values" ADD CONSTRAINT "character_resource_values_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_resource_values" ADD CONSTRAINT "character_resource_values_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_resource_values" ADD CONSTRAINT "character_resource_values_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_resource_values" ADD CONSTRAINT "character_resource_values_resource_fk" FOREIGN KEY ("run_id","resource_id") REFERENCES "public"."resources"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_resource_values" ADD CONSTRAINT "character_resource_values_computation_fk" FOREIGN KEY ("run_id","computation_id") REFERENCES "public"."computations"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_scale_values" ADD CONSTRAINT "character_scale_values_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_scale_values" ADD CONSTRAINT "character_scale_values_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_scale_values" ADD CONSTRAINT "character_scale_values_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_scale_values" ADD CONSTRAINT "character_scale_values_scale_fk" FOREIGN KEY ("run_id","scale_id") REFERENCES "public"."scales"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_scale_values" ADD CONSTRAINT "character_scale_values_computation_fk" FOREIGN KEY ("run_id","computation_id") REFERENCES "public"."computations"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_variables" ADD CONSTRAINT "character_variables_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_variables" ADD CONSTRAINT "character_variables_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_variables" ADD CONSTRAINT "character_variables_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_variables" ADD CONSTRAINT "character_variables_computation_fk" FOREIGN KEY ("run_id","computation_id") REFERENCES "public"."computations"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_memberships" ADD CONSTRAINT "household_memberships_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_memberships" ADD CONSTRAINT "household_memberships_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_memberships" ADD CONSTRAINT "household_memberships_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_memberships" ADD CONSTRAINT "household_memberships_household_fk" FOREIGN KEY ("run_id","household_id") REFERENCES "public"."households"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_memberships" ADD CONSTRAINT "household_memberships_computation_fk" FOREIGN KEY ("run_id","computation_id") REFERENCES "public"."computations"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_resource_values" ADD CONSTRAINT "household_resource_values_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_resource_values" ADD CONSTRAINT "household_resource_values_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_resource_values" ADD CONSTRAINT "household_resource_values_household_fk" FOREIGN KEY ("run_id","household_id") REFERENCES "public"."households"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_resource_values" ADD CONSTRAINT "household_resource_values_resource_fk" FOREIGN KEY ("run_id","resource_id") REFERENCES "public"."resources"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_resource_values" ADD CONSTRAINT "household_resource_values_computation_fk" FOREIGN KEY ("run_id","computation_id") REFERENCES "public"."computations"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dice_rolls" ADD CONSTRAINT "dice_rolls_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dice_rolls" ADD CONSTRAINT "dice_rolls_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dice_rolls" ADD CONSTRAINT "dice_rolls_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dice_rolls" ADD CONSTRAINT "dice_rolls_variation_fk" FOREIGN KEY ("run_id","block_variation_id") REFERENCES "public"."block_variations"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_variations" ADD CONSTRAINT "block_variations_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_variations" ADD CONSTRAINT "block_variations_block_fk" FOREIGN KEY ("run_id","block_id") REFERENCES "public"."content_blocks"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_group_fk" FOREIGN KEY ("run_id","group_id") REFERENCES "public"."groups"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_character_fk" FOREIGN KEY ("run_id","character_id") REFERENCES "public"."characters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_group_fk" FOREIGN KEY ("run_id","group_id") REFERENCES "public"."groups"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_chapter_fk" FOREIGN KEY ("run_id","chapter_id") REFERENCES "public"."chapters"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_effect_fk" FOREIGN KEY ("run_id","effect_id") REFERENCES "public"."effects"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_computation_fk" FOREIGN KEY ("run_id","computation_id") REFERENCES "public"."computations"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "computations_one_released_per_chapter" ON "computations" USING btree ("run_id","chapter_id") WHERE "computations"."is_released";--> statement-breakpoint
CREATE UNIQUE INDEX "block_variations_block_priority_key" ON "block_variations" USING btree ("run_id","block_id","priority") WHERE "block_variations"."priority" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "templates_singleton" ON "templates" USING btree ("run_id","chapter_id","kind") WHERE "templates"."kind" = 'dotaznik';--> statement-breakpoint
CREATE INDEX "audit_log_run_created_idx" ON "audit_log" USING btree ("run_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("run_id","entity_kind","entity_id");