CREATE TABLE "ai_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_model_id" varchar(200) NOT NULL,
	"tier" varchar(50),
	"cost_input_per_mtok" numeric(10, 4),
	"cost_output_per_mtok" numeric(10, 4),
	"context_window" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_content_type_favourites" (
	"brand_id" uuid NOT NULL,
	"content_type_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brand_content_type_favourites_brand_id_content_type_id_pk" PRIMARY KEY("brand_id","content_type_id")
);
--> statement-breakpoint
ALTER TABLE "brand_content_type_favourites" ADD CONSTRAINT "brand_content_type_favourites_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_content_type_favourites" ADD CONSTRAINT "brand_content_type_favourites_content_type_id_content_types_id_fk" FOREIGN KEY ("content_type_id") REFERENCES "public"."content_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_models_slug_idx" ON "ai_models" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "ai_models_active_idx" ON "ai_models" USING btree ("is_active","is_archived");--> statement-breakpoint
CREATE INDEX "brand_content_type_favourites_brand_idx" ON "brand_content_type_favourites" USING btree ("brand_id");