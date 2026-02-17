import { supabase } from "@/lib/supabase";
import { Venue } from "../types/venue";

/* -----------------------------
   GET ALL VENUES
------------------------------ */
export const getAllVenues = async (): Promise<Venue[]> => {
  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .order("event_venue_name", { ascending: true });

  if (error) throw error;
  return data as Venue[];
};

/* -----------------------------
   GET VENUE BY ID
------------------------------ */
export const getVenueById = async (id: string): Promise<Venue | null> => {
  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .eq("venue_id", id)
    .single();

  if (error) return null;
  return data as Venue;
};

/* -----------------------------
   ADD VENUE
------------------------------ */
export const addVenue = async (venue: Venue): Promise<Venue> => {
  const { data, error } = await supabase
    .from("venues")
    .insert([
      {
        venue_id: venue.venue_id,
        event_venue_name: venue.event_venue_name,
        address: venue.address,
        city: venue.city,
        postcode: venue.postcode,
        venue_contact_name: venue.venue_contact_name,
        venue_contact_phone: venue.venue_contact_phone,
        venue_contact_email: venue.venue_contact_email,
        venue_notes: venue.venue_notes,
        is_active: venue.is_active,
        capacity: venue.capacity,
        capacity_notes: venue.capacity_notes,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as Venue;
};

/* -----------------------------
   UPDATE VENUE
------------------------------ */
export const updateVenue = async (
  id: string,
  updated: Venue
): Promise<Venue> => {
  const { data, error } = await supabase
    .from("venues")
    .update({
      event_venue_name: updated.event_venue_name,
      address: updated.address,
      city: updated.city,
      postcode: updated.postcode,
      venue_contact_name: updated.venue_contact_name,
      venue_contact_phone: updated.venue_contact_phone,
      venue_contact_email: updated.venue_contact_email,
      venue_notes: updated.venue_notes,
      is_active: updated.is_active,
      capacity: updated.capacity,
      capacity_notes: updated.capacity_notes,
    })
    .eq("venue_id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Venue;
};