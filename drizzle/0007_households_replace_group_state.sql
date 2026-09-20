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
ALTER TABLE "group_memberships" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "group_memberships" CASCADE;--> statement-breakpoint
ALTER TABLE "effects" DROP CONSTRAINT "effects_related_single_source";--> statement-breakpoint
ALTER TABLE "effects" DROP CONSTRAINT "effects_merge_needs_related";--> statement-breakpoint
ALTER TABLE "characters" DROP CONSTRAINT "characters_home_group_fk";
--> statement-breakpoint
ALTER TABLE "effects" DROP CONSTRAINT "effects_group_fk";
--> statement-breakpoint
ALTER TABLE "effects" ALTER COLUMN "kind" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."effect_kind";--> statement-breakpoint
CREATE TYPE "public"."effect_kind" AS ENUM('zmena_skaly', 'nastaveni_skaly', 'zmena_zdroje', 'nastaveni_zdroje', 'blok', 'domacnost_vznik', 'domacnost_zanik');--> statement-breakpoint
ALTER TABLE "effects" ALTER COLUMN "kind" SET DATA TYPE "public"."effect_kind" USING "kind"::"public"."effect_kind";--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "default_household_id" uuid;--> statement-breakpoint
ALTER TABLE "household_resources" ADD CONSTRAINT "household_resources_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_resources" ADD CONSTRAINT "household_resources_household_fk" FOREIGN KEY ("run_id","household_id") REFERENCES "public"."households"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_resources" ADD CONSTRAINT "household_resources_resource_fk" FOREIGN KEY ("run_id","resource_id") REFERENCES "public"."resources"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_default_household_fk" FOREIGN KEY ("run_id","default_household_id") REFERENCES "public"."households"("run_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" DROP COLUMN "home_group_id";--> statement-breakpoint
ALTER TABLE "effects" DROP COLUMN "group_id";--> statement-breakpoint
ALTER TABLE "effects" DROP COLUMN "membership_action";--> statement-breakpoint
ALTER TABLE "effects" DROP COLUMN "group_role";--> statement-breakpoint
ALTER TABLE "effects" DROP COLUMN "related_from_answer";--> statement-breakpoint
ALTER TABLE "effects" ADD CONSTRAINT "effects_household_needs_two" CHECK ("effects"."kind" not in ('domacnost_vznik', 'domacnost_zanik')
          or ("effects"."character_id" is not null and "effects"."related_character_id" is not null));--> statement-breakpoint
DROP TYPE "public"."group_role";--> statement-breakpoint
DROP TYPE "public"."membership_action";