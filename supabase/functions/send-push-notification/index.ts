import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const body = await req.json();

  const title = body?.title ?? "GigSynq";
  const message = body?.body ?? "Notification";
  const dataPayload = body?.data ?? {};
  const userIds = Array.isArray(body?.user_ids) ? body.user_ids : null;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const devPushOnlyUserId = Deno.env.get("DEV_PUSH_ONLY_USER_ID");

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let query = supabase
    .from("push_tokens")
    .select("expo_push_token,user_id")
    .eq("is_active", true);

  if (userIds && userIds.length > 0) {
    query = query.in("user_id", userIds);
  }

  if (devPushOnlyUserId) {
    query = query.eq("user_id", devPushOnlyUserId);
  }

  const { data: tokens, error } = await query;

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const messages =
    tokens?.map((row) => ({
      to: row.expo_push_token,
      sound: "default",
      title,
      body: message,
      data: dataPayload,
    })) ?? [];

  const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(messages),
  });

  const result = await expoResponse.json();

  return Response.json({
    ok: true,
    sent: messages.length,
    result,
  });
});