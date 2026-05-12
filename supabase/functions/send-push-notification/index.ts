import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const IAN_USER_ID = "776b89e1-4a94-443f-a822-1a1ab7d06574";

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: tokens, error } = await supabase
    .from("push_tokens")
    .select("expo_push_token")
    .eq("user_id", IAN_USER_ID)
    .eq("is_active", true);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const messages =
    tokens?.map((row) => ({
      to: row.expo_push_token,
      sound: "default",
      title: "GigLog test",
      body: "Push notifications are working.",
      data: {
        type: "test",
      },
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