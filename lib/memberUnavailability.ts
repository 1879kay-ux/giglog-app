import { supabase } from "@/lib/supabase";

export type MemberUnavailability = {
  id: string;
  member_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export async function listMemberUnavailability(memberId: string) {
  return supabase
    .from("member_unavailability")
    .select("*")
    .eq("member_id", memberId)
    .order("start_date", { ascending: true });
}

export async function applyUnavailabilityToExistingEvents(params: {
  memberId: string;
  startDate: string;
  endDate: string;
}) {
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("event_id")
    .gte("event_date", params.startDate)
    .lte("event_date", params.endDate)
    .neq("event_status", "Deleted");

  if (eventsError) return { error: eventsError };

  const eventIds = (events ?? []).map((e: any) => e.event_id);

  if (eventIds.length === 0) return { error: null };

  const { data: existingRows, error: existingError } = await supabase
    .from("event_availability")
    .select("event_id, status")
    .eq("member_id", params.memberId)
    .in("event_id", eventIds);

  if (existingError) return { error: existingError };

  const existingByEventId = new Map(
    (existingRows ?? []).map((row: any) => [row.event_id, row.status])
  );

  const rowsToInsert = eventIds
    .filter((eventId) => !existingByEventId.has(eventId))
    .map((eventId) => ({
      event_id: eventId,
      member_id: params.memberId,
      status: "unavailable",
      status_source: "unavailability_period",
    }));

  const eventIdsToUpdate = eventIds.filter((eventId) => {
    const status = existingByEventId.get(eventId);
    return status === null || String(status).toLowerCase() === "awaiting";
  });

  if (rowsToInsert.length > 0) {
    const { error } = await supabase.from("event_availability").insert(rowsToInsert);
    if (error) return { error };
  }

  if (eventIdsToUpdate.length > 0) {
    const { error } = await supabase
      .from("event_availability")
      .update({
        status: "unavailable",
        status_source: "unavailability_period",
      })
      .eq("member_id", params.memberId)
      .in("event_id", eventIdsToUpdate);

    if (error) return { error };
  }

  return { error: null };
}

export async function addMemberUnavailability(params: {
  memberId: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
  createdBy?: string | null;
}) {
  const result = await supabase
    .from("member_unavailability")
    .insert({
      member_id: params.memberId,
      start_date: params.startDate,
      end_date: params.endDate,
      reason: params.reason ?? null,
      created_by: params.createdBy ?? null,
    })
    .select()
    .single();

  if (result.error) return result;

  const applyResult = await applyUnavailabilityToExistingEvents({
    memberId: params.memberId,
    startDate: params.startDate,
    endDate: params.endDate,
  });

  if (applyResult.error) return { data: result.data, error: applyResult.error };

  return result;
}

export async function deleteMemberUnavailability(id: string) {
  const { data: period, error: periodError } = await supabase
    .from("member_unavailability")
    .select("*")
    .eq("id", id)
    .single();

  if (periodError || !period) {
    return { error: periodError };
  }

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("event_id")
    .gte("event_date", period.start_date)
    .lte("event_date", period.end_date)
    .neq("event_status", "Deleted");

  if (eventsError) {
    return { error: eventsError };
  }

  const eventIds = (events ?? []).map((e: any) => e.event_id);

  if (eventIds.length > 0) {
    const { error: resetError } = await supabase
      .from("event_availability")
      .update({
        status: "awaiting",
        status_source: "manual",
      })
      .eq("member_id", period.member_id)
      .eq("status", "unavailable")
      .eq("status_source", "unavailability_period")
      .in("event_id", eventIds);

    if (resetError) {
      return { error: resetError };
    }
  }

  return supabase
    .from("member_unavailability")
    .delete()
    .eq("id", id);
}