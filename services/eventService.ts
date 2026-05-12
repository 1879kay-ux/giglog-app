// services/eventService.ts

import { supabase } from "../lib/supabase";

export async function getEventWithVenue(eventId: string) {
  const { data, error } = await supabase
    .from("events")
    .select(
      `
      event_id,
      created_at,
      event_date,
      event_type,
      event_notes,
      promoter_contact_name,
      promoter_contact_phone,
      promoter_contact_email,
      call_time,
      loadin_time,
      soundcheck_time,
      onstage,
      offstage,
      venue_curfew,
      bus_leave_time,
      setlist_url,
      stageplan_url,
      inputlist_url,
      monitorsends_url,
      eventinfo_url,
      income_fee,
      fee_type,
      paid_status,
      van_hire,
      fuel,
      dep_cost,
      driver_cost,
      foh_eng_cost,
      other_costs,
      manual_playing_share_override,
      include_dep_in_split,
      venue_id,
      event_status,
      venues (
        venue_id,
        event_venue_name,
        address,
        city,
        postcode,
        venue_contact_name,
        venue_contact_phone,
        venue_contact_email,
        venue_notes,
        is_active,
        capacity,
        capacity_notes
      )
    `,
    )
    .eq("event_id", eventId)
    .single();

  if (error) {
    console.error("Error fetching event with venue:", error);
    return null;
  }

  return data;
}
