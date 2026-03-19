import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as jose from "jsr:@panva/jose@6";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type JsonBody = Record<string, unknown>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getAuthToken(req: Request) {
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing authorization header");
  const [bearer, token] = authHeader.split(" ");
  if (bearer !== "Bearer" || !token) throw new Error("Auth header must be 'Bearer {token}'");
  return token;
}

function makeVerifier() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const issuer = (Deno.env.get("SB_JWT_ISSUER") ?? `${url}/auth/v1`).replace(/\/+$/, "");
  const jwks = jose.createRemoteJWKSet(new URL(`${url}/auth/v1/.well-known/jwks.json`));
  return async (jwt: string) => jose.jwtVerify(jwt, jwks, { issuer });
}

async function findAuthUserIdByEmail(
  admin: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> {
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users ?? [];
    const match = users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (match?.id) return match.id;

    if (users.length < perPage) return null;
    page += 1;
  }
}

const verifySupabaseJWT = makeVerifier();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(500, {
      error: "Missing env vars",
      missing: {
        SUPABASE_URL: !supabaseUrl,
        SUPABASE_ANON_KEY: !anonKey,
        SUPABASE_SERVICE_ROLE_KEY: !serviceRoleKey,
      },
    });
  }

  try {
    const token = getAuthToken(req);
    const { payload } = await verifySupabaseJWT(token);

    const callerId = typeof payload.sub === "string" ? payload.sub : null;
    if (!callerId) return json(401, { error: "Invalid JWT (missing sub)" });

    const body = (await req.json().catch(() => ({}))) as JsonBody;

    const band_id = String(body.band_id ?? "").trim();
    const display_name = String(body.display_name ?? "").trim();
    const email = normalizeEmail(String(body.email ?? ""));
    const member_type = String(body.member_type ?? "musician").trim();

    const is_active = body.is_active === undefined ? true : Boolean(body.is_active);
    const is_admin = body.is_admin === undefined ? false : Boolean(body.is_admin);
    const band_role = body.band_role == null ? null : String(body.band_role);
    const band_role_other = body.band_role_other == null ? null : String(body.band_role_other);
    const is_dep = body.is_dep === undefined ? null : Boolean(body.is_dep);

    const band_positions = Array.isArray(body.band_positions)
      ? (body.band_positions.map(String) as string[])
      : undefined;
    const band_positions_other = Array.isArray(body.band_positions_other)
      ? (body.band_positions_other.map(String) as string[])
      : undefined;

    if (!band_id || !display_name || !email) {
      return json(400, { error: "band_id, display_name, and email are required" });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { authorization: `Bearer ${token}`, apikey: anonKey } },
      auth: { persistSession: false },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: callerMember, error: permErr } = await userClient
      .from("band_members")
      .select("is_admin, is_active")
      .eq("band_id", band_id)
      .eq("auth_user_id", callerId)
      .maybeSingle();

    if (permErr) return json(403, { error: "Permission check failed", details: permErr.message });
    if (!callerMember?.is_active || !callerMember?.is_admin) {
      return json(403, { error: "Only active band admins can invite members" });
    }

    const { data: existing, error: existErr } = await adminClient
      .from("band_members")
      .select("member_id, auth_user_id, email")
      .eq("band_id", band_id)
      .ilike("email", email)
      .maybeSingle();

    if (existErr) return json(500, { error: "Lookup failed", details: existErr.message });
    if (existing?.member_id) {
      return json(200, {
        ok: true,
        member_id: existing.member_id,
        auth_user_id: existing.auth_user_id,
        invite_sent: false,
        note: "Member already exists for this band/email",
      });
    }

    let auth_user_id: string | null = null;
    let invite_sent = false;
    let userWasNew = false;

    const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: { invited_to_band_id: band_id },
        redirectTo: "giglog://auth/callback",
      }
    );

    if (!inviteErr && inviteData?.user?.id) {
      auth_user_id = inviteData.user.id;
      invite_sent = true;
      userWasNew = true;
    } else {
      auth_user_id = await findAuthUserIdByEmail(adminClient, email);
      if (!auth_user_id) {
        return json(500, {
          error: "Failed to invite and failed to find existing auth user",
          details: inviteErr?.message ?? "unknown",
        });
      }
      invite_sent = false;
      userWasNew = false;
    }

    const insertRow: Record<string, unknown> = {
      band_id,
      display_name,
      email,
      auth_user_id,
      member_type,
      is_active,
      is_admin,
      band_role,
      band_role_other,
      is_dep,
      is_core: member_type === "musician" && band_role === "Band",
    };

    if (band_positions !== undefined) insertRow.band_positions = band_positions;
    if (band_positions_other !== undefined) insertRow.band_positions_other = band_positions_other;

    const { data: inserted, error: insErr } = await adminClient
      .from("band_members")
      .insert(insertRow)
      .select("member_id, auth_user_id, email")
      .single();

    if (insErr) {
      if (userWasNew && auth_user_id) {
        await adminClient.auth.admin.deleteUser(auth_user_id).catch(() => {});
      }
      return json(409, { error: "Failed to create member", details: insErr.message });
    }

    return json(200, {
      ok: true,
      member_id: inserted.member_id,
      auth_user_id: inserted.auth_user_id,
      invite_sent,
      note: invite_sent
        ? "Invite email sent. User should install the app and use Forgot password to set their password."
        : "User existed; membership created.",
    });
  } catch (e: any) {
    return json(401, { error: "Unauthorized", details: String(e?.message ?? e) });
  }
});