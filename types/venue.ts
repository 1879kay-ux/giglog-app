export type Venue = {
  venue_id: string;
  event_venue_name: string;
  address: string;
  city: string;
  postcode: string;
  venue_contact_name?: string;
  venue_contact_phone?: string;
  venue_contact_email?: string;
  venue_notes?: string;
  is_active: boolean;
  capacity?: number | null;
  capacity_notes?: string;
};