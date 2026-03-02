// supabase/functions/get-doc-signed-url/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Scope = "band" | "event";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json(401, { error: "Missing bearer token" });
  }

  const token = authHeader.replace("Bearer ", "").trim();

  // Explicitly validate JWT first
  const authClient = createClient(supabaseUrl, anonKey);
  const { data: userData, error: userError } = await authClient.auth.getUser(token);

  if (userError || !userData?.user) {
    return json(401, { error: "Invalid JWT" });
  }

  let payload: { scope?: Scope; docId?: string };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const scope = payload.scope;
  const docId = payload.docId;

  if ((scope !== "band" && scope !== "event") || !docId) {
    return json(400, {
      error: "Expected { scope: 'band'|'event', docId: uuid }",
    });
  }

  const table = scope === "band" ? "band_documents" : "event_documents";

  // RLS client using user token (authorizes access to the doc row)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  const { data: docRow, error: docErr } = await userClient
    .from(table)
    .select("storage_bucket, storage_path")
    .eq("doc_id", docId)
    .maybeSingle();

  if (docErr) {
    return json(500, { error: docErr.message });
  }

  if (!docRow) {
    return json(403, { error: "Not allowed or not found" });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // 7 days in seconds
  const expiresIn = 60 * 60 * 24 * 7;

  const { data: signed, error: signErr } = await adminClient.storage
    .from(docRow.storage_bucket)
    .createSignedUrl(docRow.storage_path, expiresIn);

  if (signErr) {
    return json(500, { error: signErr.message });
  }

  return json(200, { url: signed.signedUrl, expiresIn });
});