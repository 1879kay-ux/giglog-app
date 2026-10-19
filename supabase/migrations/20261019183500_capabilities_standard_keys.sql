-- Add stable localisation identifiers for standard capability rows.
--
-- This migration deliberately does not backfill existing rows. The repository
-- does not contain a reliable standard/custom provenance marker for every
-- organisation. A later, separately reviewed backfill must positively identify
-- standard rows (preferably by an approved capability_id allowlist) before
-- setting standard_key. Custom capabilities must remain NULL.
--
-- This mapping is the agreed catalogue reference for manual review and future
-- provisioning work. It is validated for completeness below, but is not used
-- to infer or overwrite existing organisation-specific records.

ALTER TABLE public.capabilities
  ADD COLUMN IF NOT EXISTS standard_key text;

DO $$
DECLARE
  catalogue_count integer;
  distinct_key_count integer;
  distinct_name_count integer;
  distinct_tuple_count integer;
BEGIN
  SELECT
      count(*),
      count(DISTINCT standard_key),
      count(DISTINCT name),
      count(DISTINCT (name, category, standard_key))
    INTO
      catalogue_count,
      distinct_key_count,
      distinct_name_count,
      distinct_tuple_count
  FROM (
    VALUES
      ('Promoter', 'business', 'promoter'),
      ('Agent', 'business', 'agent'),
      ('Booker', 'business', 'booker'),
      ('Venue Contact', 'business', 'venue_contact'),
      ('Band Manager', 'business', 'band_manager'),
      ('Photographer', 'business', 'photographer'),
      ('Tour Accountant', 'business', 'tour_accountant'),
      ('General Accountant', 'business', 'general_accountant'),
      ('Social Media Manager', 'business', 'social_media_manager'),
      ('Videographer', 'business', 'videographer'),
      ('Website / Marketing', 'business', 'website_marketing'),
      ('Press / PR', 'business', 'press_pr'),
      ('Content Creator', 'business', 'content_creator'),
      ('Graphic Designer', 'business', 'graphic_designer'),
      ('Composer', 'creative_specialist', 'composer'),
      ('Arranger', 'creative_specialist', 'arranger'),
      ('Producer', 'creative_specialist', 'producer'),
      ('Mixing Engineer', 'creative_specialist', 'mixing_engineer'),
      ('Mastering Engineer', 'creative_specialist', 'mastering_engineer'),
      ('Teacher / Workshop Leader', 'creative_specialist', 'teacher_workshop_leader'),
      ('First Aider', 'creative_specialist', 'first_aider'),
      ('Security', 'creative_specialist', 'security'),
      ('Front of House Engineer', 'crew', 'front_of_house_engineer'),
      ('Monitor Engineer', 'crew', 'monitor_engineer'),
      ('Audio Technician', 'crew', 'audio_technician'),
      ('System Technician', 'crew', 'system_technician'),
      ('Playback Tech', 'crew', 'playback_tech'),
      ('Lighting Technician', 'crew', 'lighting_technician'),
      ('Lighting Designer', 'crew', 'lighting_designer'),
      ('Video Tech', 'crew', 'video_tech'),
      ('LED Wall Tech', 'crew', 'led_wall_tech'),
      ('Tour Manager', 'crew', 'tour_manager'),
      ('Merchandise', 'crew', 'merchandise'),
      ('Stage Tech', 'crew', 'stage_tech'),
      ('Backline Tech', 'crew', 'backline_tech'),
      ('Guitar Tech', 'crew', 'guitar_tech'),
      ('Drum Tech', 'crew', 'drum_tech'),
      ('Instrument Tech', 'crew', 'instrument_tech'),
      ('Stage Manager', 'crew', 'stage_manager'),
      ('Runner', 'crew', 'runner'),
      ('Catering', 'crew', 'catering'),
      ('Rigger', 'crew', 'rigger'),
      ('Pyro Technician', 'crew', 'pyro_technician'),
      ('Driver', 'logistics', 'driver'),
      ('Van Driver', 'logistics', 'van_driver'),
      ('Trailer Driver', 'logistics', 'trailer_driver'),
      ('Truck Driver', 'logistics', 'truck_driver'),
      ('Load-In Crew', 'logistics', 'load_in_crew'),
      ('Load-Out Crew', 'logistics', 'load_out_crew'),
      ('Road Crew', 'logistics', 'road_crew'),
      ('Accommodation Coordinator', 'logistics', 'accommodation_coordinator'),
      ('Advance Contact', 'logistics', 'advance_contact'),
      ('Transport Coordinator', 'logistics', 'transport_coordinator'),
      ('Production Assistant', 'logistics', 'production_assistant'),
      ('Other', 'other', 'other'),
      ('Lead Vocals', 'performance', 'lead_vocals'),
      ('Rap / MC', 'performance', 'rap_mc'),
      ('Spoken Word', 'performance', 'spoken_word'),
      ('Backing Vocals', 'performance', 'backing_vocals'),
      ('Drums', 'performance', 'drums'),
      ('Bass Guitar', 'performance', 'bass_guitar'),
      ('Acoustic Guitar', 'performance', 'acoustic_guitar'),
      ('Lead Guitar', 'performance', 'lead_guitar'),
      ('Electric Guitar', 'performance', 'electric_guitar'),
      ('Rhythm Guitar', 'performance', 'rhythm_guitar'),
      ('Banjo', 'performance', 'banjo'),
      ('Mandolin', 'performance', 'mandolin'),
      ('Bouzouki', 'performance', 'bouzouki'),
      ('Ukulele', 'performance', 'ukulele'),
      ('Keyboards', 'performance', 'keyboards'),
      ('Piano', 'performance', 'piano'),
      ('Synths', 'performance', 'synths'),
      ('Organ', 'performance', 'organ'),
      ('Playback / SPD-SX', 'performance', 'playback_spd_sx'),
      ('Musical Director', 'performance', 'musical_director'),
      ('Saxophone', 'performance', 'saxophone'),
      ('Trumpet', 'performance', 'trumpet'),
      ('Trombone', 'performance', 'trombone'),
      ('Flute', 'performance', 'flute'),
      ('Clarinet', 'performance', 'clarinet'),
      ('Violin', 'performance', 'violin'),
      ('Cello', 'performance', 'cello'),
      ('Percussion', 'performance', 'percussion'),
      ('Cajon', 'performance', 'cajon'),
      ('Hand Percussion', 'performance', 'hand_percussion'),
      ('Harmonica', 'performance', 'harmonica'),
      ('DJ', 'performance', 'dj'),
      ('Backing Track Operator', 'performance', 'backing_track_operator'),
      ('Bagpipes', 'performance', 'bagpipes'),
      ('Lute', 'performance', 'lute')
  ) AS catalogue(name, category, standard_key);

  IF catalogue_count <> 90
     OR distinct_key_count <> 90
     OR distinct_name_count <> 90
     OR distinct_tuple_count <> 90 THEN
    RAISE EXCEPTION
      'Expected 90 rows, distinct keys, distinct names and distinct tuples; found rows=%, keys=%, names=%, tuples=%',
      catalogue_count,
      distinct_key_count,
      distinct_name_count,
      distinct_tuple_count;
  END IF;
END
$$;

-- Only standard rows may have a key; custom rows remain NULL.
CREATE UNIQUE INDEX IF NOT EXISTS capabilities_band_standard_key_unique
  ON public.capabilities (band_id, standard_key)
  WHERE standard_key IS NOT NULL;
