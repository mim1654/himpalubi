// Legacy endpoint retained for compatibility with older clients.
// New dashboard code should call reset-password-admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "https://mim1654.github.io";

function corsHeaders(origin: string | null) {
  return {
    ...(origin === ALLOWED_ORIGIN ? { "Access-Control-Allow-Origin": ALLOWED_ORIGIN } : {}),
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");

  if (origin && origin !== ALLOWED_ORIGIN) {
    return jsonResponse({ error: "Origin tidak diizinkan." }, 403, origin);
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Metode tidak diizinkan." }, 405, origin);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Tidak ada token." }, 401, origin);

    const supabaseCaller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabaseCaller.auth.getUser();
    if (userError || !userData?.user) {
      return jsonResponse({ error: "Sesi tidak valid, coba login ulang." }, 401, origin);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: caller, error: callerError } = await supabaseAdmin
      .from("admin_users")
      .select("peran")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (callerError || caller?.peran !== "utama") {
      return jsonResponse({ error: "Hanya admin utama yang dapat mereset sandi admin lain." }, 403, origin);
    }

    const body = await req.json();
    const targetUserId = typeof body?.targetUserId === "string" ? body.targetUserId.trim() : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetUserId)) {
      return jsonResponse({ error: "ID akun tujuan tidak valid." }, 400, origin);
    }
    if (newPassword.length < 8) {
      return jsonResponse({ error: "Sandi baru harus memiliki minimal 8 karakter." }, 400, origin);
    }
    if (targetUserId.toLowerCase() === userData.user.id.toLowerCase()) {
      return jsonResponse({ error: "Gunakan fitur pemulihan sandi untuk akun sendiri." }, 400, origin);
    }

    const { data: target, error: targetError } = await supabaseAdmin
      .from("admin_users")
      .select("id,email")
      .eq("id", targetUserId)
      .maybeSingle();

    if (targetError) return jsonResponse({ error: "Akun tujuan tidak dapat diverifikasi." }, 500, origin);
    if (!target) return jsonResponse({ error: "Akun tujuan bukan admin." }, 404, origin);

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      target.id,
      { password: newPassword },
    );
    if (updateError) return jsonResponse({ error: updateError.message }, 400, origin);

    await supabaseAdmin.from("admin_activity_log").insert({
      dilakukan_oleh: userData.user.id,
      dilakukan_oleh_email: userData.user.email,
      aksi: "reset_password",
      target_user_id: target.id,
      target_email: target.email || null,
    });

    return jsonResponse({ success: true }, 200, origin);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Terjadi kesalahan di server." },
      500,
      origin,
    );
  }
});
