const supabaseUrl = Deno.env.get("SUPABASE_URL");// supabase/functions/get-doc-signed-url/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Scope = "band" | "event";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

const supabaseUrl = Deno.env.get("PROJECT_URL");
const anonKey = Deno.env.get("ANON_KEY");
const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(500, { error: "Missing env vars" });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json(401, { error: "Missing bearer token" });
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
    return json(400, { error: "Expected { scope: 'band'|'event', docId: uuid }" });
  }

  // Client with user JWT for RLS reads
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Confirm user
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json(401, { error: "Unauthorized" });
  }

  const table = scope === "band" ? "band_documents" : "event_documents";

  // RLS enforced here
  const { data: docRow, error: docErr } = await userClient
    .from(table)
    .select("storage_bucket, storage_path")
    .eq("doc_id", docId)
    .maybeSingle();

  if (docErr) return json(500, { error: docErr.message });
  if (!docRow) return json(403, { error: "Not allowed or not found" });

  const bucket = docRow.storage_bucket as string;
  const path = docRow.storage_path as string;

  // Admin client signs URL, bypassing storage policies safely
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const expiresIn = 60 * 10; // 10 minutes
  const { data: signed, error: signErr } = await adminClient.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (signErr) return json(500, { error: signErr.message });

  return json(200, { url: signed.signedUrl, expiresIn });
});