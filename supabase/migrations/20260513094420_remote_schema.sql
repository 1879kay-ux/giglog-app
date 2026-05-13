


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."availability_status" AS ENUM (
    'available',
    'provisional',
    'unavailable',
    'dep',
    'tbc',
    'awaiting'
);


ALTER TYPE "public"."availability_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_read_event"("p_event_id" "uuid", "p_band_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_member_id uuid;
  v_member_type text;
  v_band_role text;
  v_is_active boolean;
  v_is_admin boolean;
  v_can_view_all boolean;
begin
  select
    bm.member_id,
    bm.member_type,
    bm.band_role,
    coalesce(bm.is_active, true),
    coalesce(bm.is_admin, false),
    coalesce(bm.can_view_all_events, false)
  into
    v_member_id,
    v_member_type,
    v_band_role,
    v_is_active,
    v_is_admin,
    v_can_view_all
  from public.band_members bm
  where bm.band_id = p_band_id
    and bm.auth_user_id = auth.uid()
  limit 1;

  if v_member_id is null or v_is_active is not true then
    return false;
  end if;

  -- Core band + admins + explicit override see all events
  if v_can_view_all or v_is_admin or (v_member_type = 'musician' and v_band_role = 'Band') then
    return true;
  end if;

  -- Everyone else sees only assigned events
  return exists (
    select 1
    from public.event_members em
    where em.event_id = p_event_id
      and em.member_id = v_member_id
  );
end;
$$;


ALTER FUNCTION "public"."can_read_event"("p_event_id" "uuid", "p_band_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_update_event_availability"("target_member_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select exists (
    select 1
    from public.band_members bm
    where bm.member_id = target_member_id
      and bm.auth_user_id = auth.uid()
      and bm.is_active = true
  )
  or exists (
    select 1
    from public.band_members bm
    where bm.auth_user_id = auth.uid()
      and bm.is_admin = true
      and bm.is_active = true
  );
$$;


ALTER FUNCTION "public"."can_update_event_availability"("target_member_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_availability_for_new_member"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin

  -- Only create rows for core members
  if new.is_core = true then

    insert into public.event_availability (event_id, member_id, status)
    select
      e.event_id,
      new.member_id,
      'awaiting'
    from public.events e
    where e.band_id = new.band_id
    and not exists (
      select 1
      from public.event_availability ea
      where ea.event_id = e.event_id
      and ea.member_id = new.member_id
    );

  end if;

  return new;

end;
$$;


ALTER FUNCTION "public"."create_availability_for_new_member"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_event_invites_for_band"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.event_invites (event_id, member_id, status, set_by_system)
  select new.event_id, bm.member_id, 'unknown', true
  from public.band_members bm
  where bm.band_id = new.band_id
    and bm.is_active = true
    and bm.member_type = 'musician'
    and bm.band_role = 'Band'
  on conflict (event_id, member_id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."create_event_invites_for_band"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_band_id"() RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select band_id
  from public.band_members
  where auth_user_id = auth.uid()
  limit 1
$$;


ALTER FUNCTION "public"."current_band_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."event_has_custom_lineup"("p_event_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1 from public.event_members
    where event_id = p_event_id
  );
$$;


ALTER FUNCTION "public"."event_has_custom_lineup"("p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_band_admin"("_band_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.band_members bm
    where bm.band_id = _band_id
      and bm.auth_user_id = auth.uid()
      and coalesce(bm.is_active, true) = true
      and coalesce(bm.is_admin, false) = true
      and coalesce(bm.admin_mode_enabled, true) = true
  );
$$;


ALTER FUNCTION "public"."is_band_admin"("_band_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_band_member"("_band_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.band_members bm
    where bm.band_id = _band_id
      and bm.auth_user_id = auth.uid()
      and coalesce(bm.is_active, true) = true
  );
$$;


ALTER FUNCTION "public"."is_band_member"("_band_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."venues" (
    "venue_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_venue_name" "text" NOT NULL,
    "address" "text",
    "city" "text" NOT NULL,
    "postcode" "text",
    "venue_contact_name" "text",
    "venue_contact_phone" "text",
    "venue_contact_email" "text",
    "venue_notes" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "capacity" numeric,
    "capacity_notes" "text",
    CONSTRAINT "city_not_blank" CHECK (("length"(TRIM(BOTH FROM "city")) > 0)),
    CONSTRAINT "venue_name_not_blank" CHECK (("length"(TRIM(BOTH FROM "event_venue_name")) > 0))
);


ALTER TABLE "public"."venues" OWNER TO "postgres";


COMMENT ON COLUMN "public"."venues"."capacity" IS 'Venue capacity';



CREATE OR REPLACE FUNCTION "public"."search_venues"("search_text" "text") RETURNS SETOF "public"."venues"
    LANGUAGE "sql" STABLE
    AS $$
  select *
  from public.venues
  where event_venue_name ilike '%' || search_text || '%'
  order by event_venue_name;
$$;


ALTER FUNCTION "public"."search_venues"("search_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_availability_on_invite"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  insert into public.event_availability (event_id, member_id, status)
  values (new.event_id, new.member_id, null)
  on conflict (event_id, member_id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."seed_availability_on_invite"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_event_availability"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  insert into public.event_availability (event_id, member_id, status)
  select new.event_id, bm.member_id, null
  from public.band_members bm
  where bm.band_id = new.band_id
    and bm.is_active = true
    and bm.member_type = 'musician'
    and bm.band_role = 'Band'
  on conflict (event_id, member_id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."seed_event_availability"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_event_availability_core_band"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.band_id is null then
    return new;
  end if;

  insert into public.event_availability (
    event_id,
    member_id,
    status,
    notes,
    availability_status
  )
  select
    new.event_id,
    bm.member_id,
    null::public.availability_status,      -- null means "awaiting"
    null::text,
    'awaiting'::text
  from public.band_members bm
  where bm.band_id = new.band_id
    and bm.band_role = 'Band'
    and bm.member_type = 'musician'
    and coalesce(bm.is_active, false) = true
    and coalesce(bm.is_dep, false) = false
  on conflict (event_id, member_id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."seed_event_availability_core_band"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_event_band_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.band_id is null then
    new.band_id := public.current_band_id();
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."set_event_band_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_invite_status"("p_event_id" "uuid", "p_member_id" "uuid", "p_status" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  if p_status not in ('available','provisional','unavailable') then
    raise exception 'Invalid status: %', p_status;
  end if;

  update public.event_invites
  set
    status = p_status,
    set_by_system = false,
    responded_at = case
      when responded_at is null and status = 'unknown' then now()
      else responded_at
    end
  where event_id = p_event_id
    and member_id = p_member_id;
end;
$$;


ALTER FUNCTION "public"."set_invite_status"("p_event_id" "uuid", "p_member_id" "uuid", "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_event_availability_status_text"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- Keep legacy text column in sync with enum
  new.availability_status := new.status::text;
  return new;
end;
$$;


ALTER FUNCTION "public"."sync_event_availability_status_text"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_backup_event_availability_20260224" (
    "event_availability_id" "uuid",
    "event_id" "uuid",
    "member_id" "uuid",
    "status" "public"."availability_status",
    "updated_at" timestamp with time zone,
    "notes" "text",
    "availability_status" "text"
);


ALTER TABLE "public"."_backup_event_availability_20260224" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_backup_event_invites_20260224" (
    "invite_id" "uuid",
    "event_id" "uuid",
    "member_id" "uuid",
    "status" "text",
    "responded_at" timestamp with time zone,
    "note" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "set_by_system" boolean
);


ALTER TABLE "public"."_backup_event_invites_20260224" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_backup_events_20260224" (
    "event_id" "uuid",
    "created_at" timestamp with time zone,
    "event_date" "date",
    "event_type" "text",
    "event_notes" "text",
    "promoter_contact_name" "text",
    "promoter_contact_phone" "text",
    "promoter_contact_email" "text",
    "travel_venue" time without time zone,
    "loadin" time without time zone,
    "soundcheck" time without time zone,
    "onstage" time without time zone,
    "offstage" time without time zone,
    "venue_curfew" time without time zone,
    "depart_venue" time without time zone,
    "setlist_url" "text",
    "stageplan_url" "text",
    "inputslist_url" "text",
    "monitorsends_url" "text",
    "eventinfo_url" "text",
    "income_fee" numeric,
    "fee_type" "text",
    "paid_status" "text",
    "van_hire" numeric,
    "fuel" numeric,
    "dep_cost" numeric,
    "driver_cost" numeric,
    "foh_eng_cost" numeric,
    "other_costs" numeric,
    "manual_playing_share_override" numeric,
    "include_dep_in_split" boolean,
    "venue_id" "uuid",
    "event_status" "text",
    "doors" time without time zone,
    "schedule_notes" "text",
    "fee_notes" "text",
    "cost_notes" "text",
    "promo_material_url" "text",
    "doc_other_url" "text",
    "departure_address" "text",
    "departure_postcode" "text",
    "band_id" "uuid"
);


ALTER TABLE "public"."_backup_events_20260224" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."accommodation" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "address_line" "text",
    "postcode" "text",
    "check_in_at" timestamp with time zone NOT NULL,
    "check_out_at" timestamp with time zone NOT NULL,
    "rooms_count" integer,
    "total_cost" numeric(10,2),
    "booked_under_name" "text",
    "booking_reference" "text",
    "breakfast_included" boolean DEFAULT false NOT NULL,
    "parking_available" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "accommodation_check_dates" CHECK (("check_out_at" > "check_in_at")),
    CONSTRAINT "accommodation_rooms_count_check" CHECK ((("rooms_count" IS NULL) OR ("rooms_count" >= 0))),
    CONSTRAINT "accommodation_total_cost_check" CHECK ((("total_cost" IS NULL) OR ("total_cost" >= (0)::numeric)))
);


ALTER TABLE "public"."accommodation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "id" "text" DEFAULT 'global'::"text" NOT NULL,
    "default_departure_address" "text",
    "default_departure_postcode" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."band_documents" (
    "doc_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "band_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "doc_type" "text",
    "storage_bucket" "text" DEFAULT 'band-docs'::"text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "mime_type" "text",
    "size_bytes" bigint,
    "uploaded_by_member_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "band_documents_path_prefix" CHECK (("storage_path" ~~ (('bands/'::"text" || ("band_id")::"text") || '/%'::"text")))
);


ALTER TABLE "public"."band_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."band_members" (
    "member_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "display_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "is_admin" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true,
    "band_role" "text",
    "is_dep" boolean,
    "band_position" "text",
    "band_positions" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "band_id" "uuid",
    "auth_user_id" "uuid",
    "band_role_other" "text",
    "band_positions_other" "text"[] DEFAULT '{}'::"text"[],
    "member_type" "text",
    "admin_mode_enabled" boolean DEFAULT true NOT NULL,
    "is_core" boolean DEFAULT false NOT NULL,
    "permissions" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "can_view_finance" boolean DEFAULT false NOT NULL,
    "can_view_band_docs" boolean DEFAULT false NOT NULL,
    "can_view_band_and_crew" boolean DEFAULT false NOT NULL,
    "can_view_settings" boolean DEFAULT false NOT NULL,
    "can_view_all_events" boolean DEFAULT false NOT NULL,
    CONSTRAINT "band_members_band_positions_allowed" CHECK (("band_positions" <@ ARRAY['Lead Vox'::"text", 'Backing Vox'::"text", 'Drums'::"text", 'Bass'::"text", 'Lead Guitar'::"text", 'Guitar'::"text", 'Rhythm Guitar'::"text", 'Keyboards'::"text", 'Saxophone'::"text", 'Trumpet'::"text", 'Trombone'::"text"])),
    CONSTRAINT "band_members_member_type_chk" CHECK (("member_type" = ANY (ARRAY['musician'::"text", 'crew'::"text"])))
);


ALTER TABLE "public"."band_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bands" (
    "band_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "band_name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "logo_url" "text"
);


ALTER TABLE "public"."bands" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_availability" (
    "event_availability_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "status" "public"."availability_status",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "availability_status" "text" DEFAULT 'awaiting'::"text",
    "status_source" "text" DEFAULT 'manual'::"text" NOT NULL,
    CONSTRAINT "event_availability_status_source_check" CHECK (("status_source" = ANY (ARRAY['manual'::"text", 'unavailability_period'::"text"])))
);


ALTER TABLE "public"."event_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_documents" (
    "doc_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "doc_type" "text",
    "storage_bucket" "text" DEFAULT 'event-docs'::"text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "mime_type" "text",
    "size_bytes" bigint,
    "uploaded_by_member_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "event_documents_path_prefix" CHECK (("storage_path" ~~ (('events/'::"text" || ("event_id")::"text") || '/%'::"text")))
);


ALTER TABLE "public"."event_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_finance" (
    "event_id" "uuid" NOT NULL,
    "fee_type" "text",
    "paid_status" "text",
    "manual_playing_share_override" numeric,
    "income_guarantee" numeric,
    "income_fee" numeric,
    "income_door" numeric,
    "doors" time without time zone,
    "accommodation_cost" numeric,
    "dep_cost" numeric,
    "driver_cost" numeric,
    "foh_eng_cost" numeric,
    "other_costs" numeric,
    "fee_notes" "text",
    "cost_notes" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_finance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_invites" (
    "invite_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "responded_at" timestamp with time zone,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "set_by_system" boolean DEFAULT false NOT NULL,
    CONSTRAINT "event_invites_status_allowed" CHECK (("status" = ANY (ARRAY['unknown'::"text", 'available'::"text", 'provisional'::"text", 'unavailable'::"text"])))
);


ALTER TABLE "public"."event_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_members" (
    "event_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "event_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "event_date" "date" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_notes" "text",
    "promoter_contact_name" "text",
    "promoter_contact_phone" "text",
    "promoter_contact_email" "text",
    "travel_venue" time without time zone,
    "loadin" time without time zone,
    "soundcheck" time without time zone,
    "onstage" time without time zone,
    "offstage" time without time zone,
    "venue_curfew" time without time zone,
    "depart_venue" time without time zone,
    "setlist_url" "text",
    "stageplan_url" "text",
    "inputslist_url" "text",
    "monitorsends_url" "text",
    "eventinfo_url" "text",
    "income_fee" numeric,
    "fee_type" "text",
    "paid_status" "text",
    "van_hire" numeric,
    "fuel" numeric,
    "dep_cost" numeric,
    "driver_cost" numeric,
    "foh_eng_cost" numeric,
    "other_costs" numeric,
    "manual_playing_share_override" numeric,
    "include_dep_in_split" boolean,
    "venue_id" "uuid",
    "event_status" "text" NOT NULL,
    "doors" time without time zone,
    "schedule_notes" "text",
    "fee_notes" "text",
    "cost_notes" "text",
    "promo_material_url" "text",
    "doc_other_url" "text",
    "departure_address" "text",
    "departure_postcode" "text",
    "band_id" "uuid",
    "income_guarantee" numeric,
    "income_door" numeric,
    "accommodation_cost" numeric
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."member_unavailability" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "member_unavailability_date_check" CHECK (("end_date" >= "start_date"))
);


ALTER TABLE "public"."member_unavailability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_name" "text",
    "default_departure_address" "text",
    "default_departure_postcode" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_admin" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "band_id" "uuid" NOT NULL,
    "expo_push_token" "text" NOT NULL,
    "platform" "text",
    "device_name" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."push_tokens" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_event_availability" WITH ("security_invoker"='true') AS
 SELECT "ea"."event_id",
    "ea"."member_id",
    "bm"."display_name",
    ("ea"."status")::"text" AS "effective_status"
   FROM ("public"."event_availability" "ea"
     JOIN "public"."band_members" "bm" ON (("bm"."member_id" = "ea"."member_id")));


ALTER VIEW "public"."v_event_availability" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_event_availability_summary" WITH ("security_invoker"='true') AS
 SELECT "e"."event_id",
    "count"(*) FILTER (WHERE (("ea"."status")::"text" = 'Available'::"text")) AS "available_count",
    "count"(*) FILTER (WHERE (("ea"."status")::"text" = 'Provisional'::"text")) AS "provisional_count",
    "count"(*) FILTER (WHERE (("ea"."status")::"text" = 'Unavailable'::"text")) AS "unavailable_count",
    (0)::bigint AS "awaiting_count",
    "count"("ea"."member_id") AS "total_expected"
   FROM ("public"."events" "e"
     LEFT JOIN "public"."event_availability" "ea" ON (("ea"."event_id" = "e"."event_id")))
  GROUP BY "e"."event_id";


ALTER VIEW "public"."v_event_availability_summary" OWNER TO "postgres";


ALTER TABLE ONLY "public"."accommodation"
    ADD CONSTRAINT "accommodation_event_id_key" UNIQUE ("event_id");



ALTER TABLE ONLY "public"."accommodation"
    ADD CONSTRAINT "accommodation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."band_documents"
    ADD CONSTRAINT "band_documents_pkey" PRIMARY KEY ("doc_id");



ALTER TABLE ONLY "public"."band_members"
    ADD CONSTRAINT "band_members_band_id_member_id_key" UNIQUE ("band_id", "member_id");



ALTER TABLE ONLY "public"."band_members"
    ADD CONSTRAINT "band_members_pkey" PRIMARY KEY ("member_id");



ALTER TABLE ONLY "public"."bands"
    ADD CONSTRAINT "bands_pkey" PRIMARY KEY ("band_id");



ALTER TABLE ONLY "public"."event_availability"
    ADD CONSTRAINT "event_availability_event_id_member_id_key" UNIQUE ("event_id", "member_id");



ALTER TABLE ONLY "public"."event_availability"
    ADD CONSTRAINT "event_availability_pkey" PRIMARY KEY ("event_availability_id");



ALTER TABLE ONLY "public"."event_availability"
    ADD CONSTRAINT "event_availability_unique_event_member" UNIQUE ("event_id", "member_id");



ALTER TABLE ONLY "public"."event_documents"
    ADD CONSTRAINT "event_documents_pkey" PRIMARY KEY ("doc_id");



ALTER TABLE ONLY "public"."event_finance"
    ADD CONSTRAINT "event_finance_pkey" PRIMARY KEY ("event_id");



ALTER TABLE ONLY "public"."event_invites"
    ADD CONSTRAINT "event_invites_pkey" PRIMARY KEY ("invite_id");



ALTER TABLE ONLY "public"."event_invites"
    ADD CONSTRAINT "event_invites_unique" UNIQUE ("event_id", "member_id");



ALTER TABLE ONLY "public"."event_members"
    ADD CONSTRAINT "event_members_pkey" PRIMARY KEY ("event_id", "member_id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("event_id");



ALTER TABLE ONLY "public"."member_unavailability"
    ADD CONSTRAINT "member_unavailability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_expo_push_token_key" UNIQUE ("expo_push_token");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."venues"
    ADD CONSTRAINT "venues_event_venue_name_key" UNIQUE ("event_venue_name");



ALTER TABLE ONLY "public"."venues"
    ADD CONSTRAINT "venues_pkey" PRIMARY KEY ("venue_id");



CREATE INDEX "accommodation_check_in_idx" ON "public"."accommodation" USING "btree" ("check_in_at");



CREATE INDEX "accommodation_event_id_idx" ON "public"."accommodation" USING "btree" ("event_id");



CREATE INDEX "band_documents_band_id_idx" ON "public"."band_documents" USING "btree" ("band_id");



CREATE INDEX "band_documents_created_at_idx" ON "public"."band_documents" USING "btree" ("created_at" DESC);



CREATE INDEX "band_members_auth_user_id_idx" ON "public"."band_members" USING "btree" ("auth_user_id");



CREATE INDEX "event_availability_event_id_idx" ON "public"."event_availability" USING "btree" ("event_id");



CREATE UNIQUE INDEX "event_availability_event_member_ux" ON "public"."event_availability" USING "btree" ("event_id", "member_id");



CREATE INDEX "event_documents_created_at_idx" ON "public"."event_documents" USING "btree" ("created_at" DESC);



CREATE INDEX "event_documents_event_id_idx" ON "public"."event_documents" USING "btree" ("event_id");



CREATE INDEX "idx_event_availability_event" ON "public"."event_availability" USING "btree" ("event_id");



CREATE INDEX "idx_event_availability_member" ON "public"."event_availability" USING "btree" ("member_id");



CREATE INDEX "idx_member_unavailability_end_date" ON "public"."member_unavailability" USING "btree" ("end_date");



CREATE INDEX "idx_member_unavailability_member_id" ON "public"."member_unavailability" USING "btree" ("member_id");



CREATE INDEX "idx_member_unavailability_start_date" ON "public"."member_unavailability" USING "btree" ("start_date");



CREATE UNIQUE INDEX "venues_name_city_unique" ON "public"."venues" USING "btree" ("lower"("event_venue_name"), "lower"("city"));



CREATE UNIQUE INDEX "venues_unique_name_city" ON "public"."venues" USING "btree" ("lower"("event_venue_name"), "lower"("city"));



CREATE OR REPLACE TRIGGER "trg_accommodation_updated_at" BEFORE UPDATE ON "public"."accommodation" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_app_settings_updated_at" BEFORE UPDATE ON "public"."app_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_create_availability_for_new_member" AFTER INSERT ON "public"."band_members" FOR EACH ROW EXECUTE FUNCTION "public"."create_availability_for_new_member"();



CREATE OR REPLACE TRIGGER "trg_event_availability_updated_at" BEFORE UPDATE ON "public"."event_availability" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_event_finance_updated_at" BEFORE UPDATE ON "public"."event_finance" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_event_invites_updated_at" BEFORE UPDATE ON "public"."event_invites" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_events_create_invites" AFTER INSERT ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."create_event_invites_for_band"();



CREATE OR REPLACE TRIGGER "trg_invites_seed_availability" AFTER INSERT ON "public"."event_invites" FOR EACH ROW EXECUTE FUNCTION "public"."seed_availability_on_invite"();



CREATE OR REPLACE TRIGGER "trg_seed_event_availability" AFTER INSERT ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."seed_event_availability"();



CREATE OR REPLACE TRIGGER "trg_seed_event_availability_core_band" AFTER INSERT ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."seed_event_availability_core_band"();



CREATE OR REPLACE TRIGGER "trg_set_event_band_id" BEFORE INSERT ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."set_event_band_id"();



CREATE OR REPLACE TRIGGER "trg_sync_event_availability_status_text" BEFORE INSERT OR UPDATE OF "status" ON "public"."event_availability" FOR EACH ROW EXECUTE FUNCTION "public"."sync_event_availability_status_text"();



ALTER TABLE ONLY "public"."accommodation"
    ADD CONSTRAINT "accommodation_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("event_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."band_documents"
    ADD CONSTRAINT "band_documents_band_id_fkey" FOREIGN KEY ("band_id") REFERENCES "public"."bands"("band_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."band_documents"
    ADD CONSTRAINT "band_documents_uploaded_by_member_id_fkey" FOREIGN KEY ("uploaded_by_member_id") REFERENCES "public"."band_members"("member_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."band_members"
    ADD CONSTRAINT "band_members_band_id_fkey" FOREIGN KEY ("band_id") REFERENCES "public"."bands"("band_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_availability"
    ADD CONSTRAINT "event_availability_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("event_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_availability"
    ADD CONSTRAINT "event_availability_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."band_members"("member_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_documents"
    ADD CONSTRAINT "event_documents_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("event_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_documents"
    ADD CONSTRAINT "event_documents_uploaded_by_member_id_fkey" FOREIGN KEY ("uploaded_by_member_id") REFERENCES "public"."band_members"("member_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_finance"
    ADD CONSTRAINT "event_finance_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("event_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_invites"
    ADD CONSTRAINT "event_invites_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("event_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_invites"
    ADD CONSTRAINT "event_invites_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."band_members"("member_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_members"
    ADD CONSTRAINT "event_members_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("event_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_members"
    ADD CONSTRAINT "event_members_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."band_members"("member_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_band_id_fkey" FOREIGN KEY ("band_id") REFERENCES "public"."bands"("band_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("venue_id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."member_unavailability"
    ADD CONSTRAINT "member_unavailability_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."band_members"("member_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_band_id_fkey" FOREIGN KEY ("band_id") REFERENCES "public"."bands"("band_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage all unavailability" ON "public"."member_unavailability" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."band_members" "bm"
  WHERE (("bm"."auth_user_id" = "auth"."uid"()) AND ("bm"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."band_members" "bm"
  WHERE (("bm"."auth_user_id" = "auth"."uid"()) AND ("bm"."is_admin" = true)))));



CREATE POLICY "Admins can view all unavailability" ON "public"."member_unavailability" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."band_members" "bm"
  WHERE (("bm"."auth_user_id" = "auth"."uid"()) AND ("bm"."is_admin" = true)))));



CREATE POLICY "Band members can view band unavailability" ON "public"."member_unavailability" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."band_members" "viewer"
     JOIN "public"."band_members" "target" ON (("target"."member_id" = "member_unavailability"."member_id")))
  WHERE (("viewer"."auth_user_id" = "auth"."uid"()) AND ("viewer"."is_active" = true) AND ("target"."band_id" = "viewer"."band_id")))));



CREATE POLICY "Members can delete own unavailability" ON "public"."member_unavailability" FOR DELETE TO "authenticated" USING (("member_id" IN ( SELECT "bm"."member_id"
   FROM "public"."band_members" "bm"
  WHERE ("bm"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "Members can insert own unavailability" ON "public"."member_unavailability" FOR INSERT TO "authenticated" WITH CHECK (("member_id" IN ( SELECT "bm"."member_id"
   FROM "public"."band_members" "bm"
  WHERE ("bm"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "Members can update own unavailability" ON "public"."member_unavailability" FOR UPDATE TO "authenticated" USING (("member_id" IN ( SELECT "bm"."member_id"
   FROM "public"."band_members" "bm"
  WHERE ("bm"."auth_user_id" = "auth"."uid"())))) WITH CHECK (("member_id" IN ( SELECT "bm"."member_id"
   FROM "public"."band_members" "bm"
  WHERE ("bm"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "Members can view own unavailability" ON "public"."member_unavailability" FOR SELECT TO "authenticated" USING (("member_id" IN ( SELECT "bm"."member_id"
   FROM "public"."band_members" "bm"
  WHERE ("bm"."auth_user_id" = "auth"."uid"()))));



ALTER TABLE "public"."_backup_event_availability_20260224" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."_backup_event_invites_20260224" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."_backup_events_20260224" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."accommodation" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "accommodation_delete_band_admins" ON "public"."accommodation" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."events" "e"
     JOIN "public"."band_members" "bm" ON (("bm"."band_id" = "e"."band_id")))
  WHERE (("e"."event_id" = "accommodation"."event_id") AND ("bm"."auth_user_id" = "auth"."uid"()) AND ("bm"."is_admin" = true) AND ("bm"."is_active" = true) AND ("bm"."is_dep" = false)))));



CREATE POLICY "accommodation_insert_band_admins" ON "public"."accommodation" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."events" "e"
     JOIN "public"."band_members" "bm" ON (("bm"."band_id" = "e"."band_id")))
  WHERE (("e"."event_id" = "accommodation"."event_id") AND ("bm"."auth_user_id" = "auth"."uid"()) AND ("bm"."is_admin" = true) AND ("bm"."is_active" = true) AND ("bm"."is_dep" = false)))));



CREATE POLICY "accommodation_select_band_members" ON "public"."accommodation" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."events" "e"
     JOIN "public"."band_members" "bm" ON (("bm"."band_id" = "e"."band_id")))
  WHERE (("e"."event_id" = "accommodation"."event_id") AND ("bm"."auth_user_id" = "auth"."uid"())))));



CREATE POLICY "accommodation_update_band_admins" ON "public"."accommodation" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."events" "e"
     JOIN "public"."band_members" "bm" ON (("bm"."band_id" = "e"."band_id")))
  WHERE (("e"."event_id" = "accommodation"."event_id") AND ("bm"."auth_user_id" = "auth"."uid"()) AND ("bm"."is_admin" = true) AND ("bm"."is_active" = true) AND ("bm"."is_dep" = false))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."events" "e"
     JOIN "public"."band_members" "bm" ON (("bm"."band_id" = "e"."band_id")))
  WHERE (("e"."event_id" = "accommodation"."event_id") AND ("bm"."auth_user_id" = "auth"."uid"()) AND ("bm"."is_admin" = true) AND ("bm"."is_active" = true) AND ("bm"."is_dep" = false)))));



ALTER TABLE "public"."app_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "app_settings_insert_all" ON "public"."app_settings" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "app_settings_select_all" ON "public"."app_settings" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "app_settings_update_all" ON "public"."app_settings" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "app_settings_update_auth" ON "public"."app_settings" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated users can insert venues" ON "public"."venues" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "availability_delete_admin_only" ON "public"."event_availability" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."band_members" "bm_admin"
  WHERE (("bm_admin"."auth_user_id" = "auth"."uid"()) AND ("bm_admin"."is_admin" = true)))));



CREATE POLICY "availability_insert_admin_or_own" ON "public"."event_availability" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."band_members" "bm"
  WHERE (("bm"."member_id" = "event_availability"."member_id") AND ("bm"."auth_user_id" = "auth"."uid"()) AND ("bm"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."band_members" "bm"
  WHERE (("bm"."auth_user_id" = "auth"."uid"()) AND ("bm"."is_admin" = true) AND ("bm"."is_active" = true) AND ("bm"."band_id" = "public"."current_band_id"()))))));



CREATE POLICY "availability_select_core_admin_or_own_dep" ON "public"."event_availability" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."band_members" "bm_admin"
  WHERE (("bm_admin"."auth_user_id" = "auth"."uid"()) AND ("bm_admin"."is_admin" = true) AND ("bm_admin"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."band_members" "bm_core"
  WHERE (("bm_core"."auth_user_id" = "auth"."uid"()) AND ("bm_core"."is_active" = true) AND (COALESCE("bm_core"."is_dep", false) = false)))) OR (EXISTS ( SELECT 1
   FROM "public"."band_members" "bm_dep"
  WHERE (("bm_dep"."auth_user_id" = "auth"."uid"()) AND ("bm_dep"."member_id" = "event_availability"."member_id") AND ("bm_dep"."is_active" = true) AND (COALESCE("bm_dep"."is_dep", false) = true))))));



CREATE POLICY "availability_update_own_or_admin" ON "public"."event_availability" FOR UPDATE TO "authenticated" USING ("public"."can_update_event_availability"("member_id")) WITH CHECK (true);



CREATE POLICY "band_docs_admin_delete" ON "public"."band_documents" FOR DELETE USING ("public"."is_band_admin"("band_id"));



CREATE POLICY "band_docs_admin_insert" ON "public"."band_documents" FOR INSERT WITH CHECK ("public"."is_band_admin"("band_id"));



CREATE POLICY "band_docs_admin_update" ON "public"."band_documents" FOR UPDATE USING ("public"."is_band_admin"("band_id")) WITH CHECK ("public"."is_band_admin"("band_id"));



CREATE POLICY "band_docs_delete_admin_only" ON "public"."band_documents" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."band_members" "bm"
  WHERE (("bm"."band_id" = "band_documents"."band_id") AND ("bm"."auth_user_id" = "auth"."uid"()) AND ("bm"."is_active" = true) AND ("bm"."is_admin" = true) AND ("bm"."admin_mode_enabled" = true)))));



CREATE POLICY "band_docs_insert_admin_only" ON "public"."band_documents" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."band_members" "bm"
  WHERE (("bm"."band_id" = "band_documents"."band_id") AND ("bm"."auth_user_id" = "auth"."uid"()) AND ("bm"."is_active" = true) AND ("bm"."is_admin" = true) AND ("bm"."admin_mode_enabled" = true)))));



CREATE POLICY "band_docs_select_band_members" ON "public"."band_documents" FOR SELECT USING ("public"."is_band_member"("band_id"));



CREATE POLICY "band_docs_select_for_band_members" ON "public"."band_documents" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."band_members" "bm"
  WHERE (("bm"."band_id" = "band_documents"."band_id") AND ("bm"."auth_user_id" = "auth"."uid"()) AND ("bm"."is_active" = true)))));



CREATE POLICY "band_docs_update_admin_only" ON "public"."band_documents" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."band_members" "bm"
  WHERE (("bm"."band_id" = "band_documents"."band_id") AND ("bm"."auth_user_id" = "auth"."uid"()) AND ("bm"."is_active" = true) AND ("bm"."is_admin" = true) AND ("bm"."admin_mode_enabled" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."band_members" "bm"
  WHERE (("bm"."band_id" = "band_documents"."band_id") AND ("bm"."auth_user_id" = "auth"."uid"()) AND ("bm"."is_active" = true) AND ("bm"."is_admin" = true) AND ("bm"."admin_mode_enabled" = true)))));



ALTER TABLE "public"."band_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."band_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "band_members_admin_update" ON "public"."band_members" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."band_members" "me"
  WHERE (("me"."band_id" = "band_members"."band_id") AND ("me"."auth_user_id" = "auth"."uid"()) AND ("me"."is_admin" = true) AND (COALESCE("me"."is_active", true) = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."band_members" "me"
  WHERE (("me"."band_id" = "band_members"."band_id") AND ("me"."auth_user_id" = "auth"."uid"()) AND ("me"."is_admin" = true) AND (COALESCE("me"."is_active", true) = true)))));



CREATE POLICY "band_members_select_band" ON "public"."band_members" FOR SELECT TO "authenticated" USING (("band_id" = "public"."current_band_id"()));



ALTER TABLE "public"."bands" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bands_select_band" ON "public"."bands" FOR SELECT TO "authenticated" USING (("band_id" = "public"."current_band_id"()));



ALTER TABLE "public"."event_availability" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_docs_delete_admin_only" ON "public"."event_documents" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."event_id" = "event_documents"."event_id") AND "public"."is_band_admin"("e"."band_id")))));



CREATE POLICY "event_docs_insert_admin_only" ON "public"."event_documents" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."event_id" = "event_documents"."event_id") AND "public"."is_band_admin"("e"."band_id")))));



CREATE POLICY "event_docs_select_band_members" ON "public"."event_documents" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."event_id" = "event_documents"."event_id") AND "public"."is_band_member"("e"."band_id")))));



CREATE POLICY "event_docs_update_admin_only" ON "public"."event_documents" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."event_id" = "event_documents"."event_id") AND "public"."is_band_admin"("e"."band_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."event_id" = "event_documents"."event_id") AND "public"."is_band_admin"("e"."band_id")))));



ALTER TABLE "public"."event_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_finance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_finance_select_core_admin" ON "public"."event_finance" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."events" "e"
     JOIN "public"."band_members" "bm" ON (("bm"."band_id" = "e"."band_id")))
  WHERE (("e"."event_id" = "event_finance"."event_id") AND ("bm"."auth_user_id" = "auth"."uid"()) AND ("bm"."is_active" = true) AND (("bm"."is_admin" = true) OR (COALESCE("bm"."is_dep", false) = false) OR (COALESCE("bm"."can_view_finance", false) = true))))));



CREATE POLICY "event_finance_write_admin_only" ON "public"."event_finance" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."events" "e"
     JOIN "public"."band_members" "bm" ON (("bm"."band_id" = "e"."band_id")))
  WHERE (("e"."event_id" = "event_finance"."event_id") AND ("bm"."auth_user_id" = "auth"."uid"()) AND ("bm"."is_active" = true) AND ("bm"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."events" "e"
     JOIN "public"."band_members" "bm" ON (("bm"."band_id" = "e"."band_id")))
  WHERE (("e"."event_id" = "event_finance"."event_id") AND ("bm"."auth_user_id" = "auth"."uid"()) AND ("bm"."is_active" = true) AND ("bm"."is_admin" = true)))));



ALTER TABLE "public"."event_invites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_invites_admin_delete" ON "public"."event_invites" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."band_members" "bm"
  WHERE (("bm"."auth_user_id" = "auth"."uid"()) AND ("bm"."is_admin" = true) AND ("bm"."is_active" = true)))));



CREATE POLICY "event_invites_admin_insert" ON "public"."event_invites" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."band_members" "bm"
  WHERE (("bm"."auth_user_id" = "auth"."uid"()) AND ("bm"."is_admin" = true) AND ("bm"."is_active" = true)))) AND (EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."event_id" = "event_invites"."event_id") AND ("e"."band_id" = "public"."current_band_id"()))))));



CREATE POLICY "event_invites_admin_update" ON "public"."event_invites" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."band_members" "bm"
  WHERE (("bm"."auth_user_id" = "auth"."uid"()) AND ("bm"."is_admin" = true) AND ("bm"."is_active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."band_members" "bm"
  WHERE (("bm"."auth_user_id" = "auth"."uid"()) AND ("bm"."is_admin" = true) AND ("bm"."is_active" = true)))));



CREATE POLICY "event_invites_select_band" ON "public"."event_invites" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."events" "e"
  WHERE (("e"."event_id" = "event_invites"."event_id") AND ("e"."band_id" = "public"."current_band_id"())))));



ALTER TABLE "public"."event_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_members_delete_admin_only" ON "public"."event_members" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."is_admin" = true)))));



CREATE POLICY "event_members_insert_admin_only" ON "public"."event_members" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."is_admin" = true)))));



CREATE POLICY "event_members_select_member_or_admin" ON "public"."event_members" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."band_members" "bm_admin"
  WHERE (("bm_admin"."auth_user_id" = "auth"."uid"()) AND ("bm_admin"."is_admin" = true)))) OR (EXISTS ( SELECT 1
   FROM ("public"."band_members" "bm_me"
     JOIN "public"."events" "e" ON ((("e"."band_id" = "bm_me"."band_id") AND ("e"."event_id" = "event_members"."event_id"))))
  WHERE ("bm_me"."auth_user_id" = "auth"."uid"())))));



CREATE POLICY "event_members_update_admin_only" ON "public"."event_members" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."is_admin" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."is_admin" = true)))));



ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "events update: band admins" ON "public"."events" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."band_members" "bm"
  WHERE (("bm"."band_id" = "events"."band_id") AND ("bm"."is_admin" = true) AND ("bm"."is_active" = true) AND ("bm"."is_dep" = false))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."band_members" "bm"
  WHERE (("bm"."band_id" = "events"."band_id") AND ("bm"."is_admin" = true) AND ("bm"."is_active" = true) AND ("bm"."is_dep" = false)))));



CREATE POLICY "events_insert_allow_authenticated_tmp" ON "public"."events" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "events_select_visibility_v3" ON "public"."events" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."band_members" "bm"
  WHERE (("bm"."auth_user_id" = "auth"."uid"()) AND ("bm"."band_id" = "events"."band_id") AND ("bm"."is_active" = true) AND (("bm"."is_admin" = true) OR (("bm"."member_type" = 'musician'::"text") AND ("bm"."band_role" = 'Band'::"text") AND (COALESCE("bm"."is_dep", false) = false)))))) OR (EXISTS ( SELECT 1
   FROM "public"."band_members" "bm"
  WHERE (("bm"."auth_user_id" = "auth"."uid"()) AND ("bm"."is_active" = true) AND (EXISTS ( SELECT 1
           FROM "public"."event_availability" "ea"
          WHERE (("ea"."event_id" = "events"."event_id") AND ("ea"."member_id" = "bm"."member_id")))))))));



ALTER TABLE "public"."member_unavailability" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "push_tokens_delete_own" ON "public"."push_tokens" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "push_tokens_insert_own" ON "public"."push_tokens" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "push_tokens_select_own" ON "public"."push_tokens" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "push_tokens_update_own" ON "public"."push_tokens" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."venues" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "venues_select_all_authenticated" ON "public"."venues" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "venues_update_admin_only" ON "public"."venues" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."band_members" "bm"
  WHERE (("bm"."auth_user_id" = "auth"."uid"()) AND ("bm"."is_admin" = true) AND ("bm"."is_active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."band_members" "bm"
  WHERE (("bm"."auth_user_id" = "auth"."uid"()) AND ("bm"."is_admin" = true) AND ("bm"."is_active" = true)))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."can_read_event"("p_event_id" "uuid", "p_band_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_read_event"("p_event_id" "uuid", "p_band_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_read_event"("p_event_id" "uuid", "p_band_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_update_event_availability"("target_member_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_update_event_availability"("target_member_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_update_event_availability"("target_member_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_availability_for_new_member"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_availability_for_new_member"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_availability_for_new_member"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_event_invites_for_band"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_event_invites_for_band"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_event_invites_for_band"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_band_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_band_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_band_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."event_has_custom_lineup"("p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."event_has_custom_lineup"("p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."event_has_custom_lineup"("p_event_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_band_admin"("_band_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_band_admin"("_band_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_band_admin"("_band_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_band_member"("_band_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_band_member"("_band_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_band_member"("_band_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."venues" TO "anon";
GRANT ALL ON TABLE "public"."venues" TO "authenticated";
GRANT ALL ON TABLE "public"."venues" TO "service_role";



GRANT ALL ON FUNCTION "public"."search_venues"("search_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_venues"("search_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_venues"("search_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_availability_on_invite"() TO "anon";
GRANT ALL ON FUNCTION "public"."seed_availability_on_invite"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_availability_on_invite"() TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_event_availability"() TO "anon";
GRANT ALL ON FUNCTION "public"."seed_event_availability"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_event_availability"() TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_event_availability_core_band"() TO "anon";
GRANT ALL ON FUNCTION "public"."seed_event_availability_core_band"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_event_availability_core_band"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_event_band_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_event_band_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_event_band_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_invite_status"("p_event_id" "uuid", "p_member_id" "uuid", "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_invite_status"("p_event_id" "uuid", "p_member_id" "uuid", "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_invite_status"("p_event_id" "uuid", "p_member_id" "uuid", "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_event_availability_status_text"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_event_availability_status_text"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_event_availability_status_text"() TO "service_role";


















GRANT ALL ON TABLE "public"."_backup_event_availability_20260224" TO "anon";
GRANT ALL ON TABLE "public"."_backup_event_availability_20260224" TO "authenticated";
GRANT ALL ON TABLE "public"."_backup_event_availability_20260224" TO "service_role";



GRANT ALL ON TABLE "public"."_backup_event_invites_20260224" TO "anon";
GRANT ALL ON TABLE "public"."_backup_event_invites_20260224" TO "authenticated";
GRANT ALL ON TABLE "public"."_backup_event_invites_20260224" TO "service_role";



GRANT ALL ON TABLE "public"."_backup_events_20260224" TO "anon";
GRANT ALL ON TABLE "public"."_backup_events_20260224" TO "authenticated";
GRANT ALL ON TABLE "public"."_backup_events_20260224" TO "service_role";



GRANT ALL ON TABLE "public"."accommodation" TO "anon";
GRANT ALL ON TABLE "public"."accommodation" TO "authenticated";
GRANT ALL ON TABLE "public"."accommodation" TO "service_role";



GRANT ALL ON TABLE "public"."app_settings" TO "anon";
GRANT ALL ON TABLE "public"."app_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."app_settings" TO "service_role";



GRANT ALL ON TABLE "public"."band_documents" TO "anon";
GRANT ALL ON TABLE "public"."band_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."band_documents" TO "service_role";



GRANT ALL ON TABLE "public"."band_members" TO "anon";
GRANT ALL ON TABLE "public"."band_members" TO "authenticated";
GRANT ALL ON TABLE "public"."band_members" TO "service_role";



GRANT ALL ON TABLE "public"."bands" TO "anon";
GRANT ALL ON TABLE "public"."bands" TO "authenticated";
GRANT ALL ON TABLE "public"."bands" TO "service_role";



GRANT ALL ON TABLE "public"."event_availability" TO "anon";
GRANT ALL ON TABLE "public"."event_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."event_availability" TO "service_role";



GRANT ALL ON TABLE "public"."event_documents" TO "anon";
GRANT ALL ON TABLE "public"."event_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."event_documents" TO "service_role";



GRANT ALL ON TABLE "public"."event_finance" TO "anon";
GRANT ALL ON TABLE "public"."event_finance" TO "authenticated";
GRANT ALL ON TABLE "public"."event_finance" TO "service_role";



GRANT ALL ON TABLE "public"."event_invites" TO "anon";
GRANT ALL ON TABLE "public"."event_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."event_invites" TO "service_role";



GRANT ALL ON TABLE "public"."event_members" TO "anon";
GRANT ALL ON TABLE "public"."event_members" TO "authenticated";
GRANT ALL ON TABLE "public"."event_members" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."member_unavailability" TO "anon";
GRANT ALL ON TABLE "public"."member_unavailability" TO "authenticated";
GRANT ALL ON TABLE "public"."member_unavailability" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."push_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."v_event_availability" TO "anon";
GRANT ALL ON TABLE "public"."v_event_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."v_event_availability" TO "service_role";



GRANT ALL ON TABLE "public"."v_event_availability_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_event_availability_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_event_availability_summary" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































