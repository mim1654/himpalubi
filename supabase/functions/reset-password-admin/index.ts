// Edge Function: reset-password-admin
// Hanya admin dengan peran 'utama' yang boleh memanggil ini untuk
// mereset sandi admin lain. Kunci rahasia (service_role) HANYA dipakai
// di sini, di server Supabase — tidak pernah dikirim ke frontend.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Tidak ada token." }, 401);

    // Client yang "berbicara" sebagai pemanggil, untuk mengetahui siapa dia
    const supabaseCaller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabaseCaller.auth.getUser();
    if (userError || !userData?.user) {
      return jsonResponse({ error: "Sesi tidak valid, coba login ulang." }, 401);
    }

    // Client dengan akses penuh (service_role), HANYA dipakai di server ini
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Pemanggil (bukan target) HARUS admin utama
    const { data: pemanggil } = await supabaseAdmin
      .from("admin_users")
      .select("peran")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (!pemanggil || pemanggil.peran !== "utama") {
      return jsonResponse({ error: "Tidak memiliki akses." }, 403);
    }

    const { target_user_id, password_baru } = await req.json();

    if (!target_user_id || !password_baru || String(password_baru).length < 8) {
      return jsonResponse({ error: "Data tidak lengkap atau sandi kurang dari 8 karakter." }, 400);
    }

    if (target_user_id === userData.user.id) {
      return jsonResponse({ error: "Gunakan fitur lupa sandi biasa untuk mereset sandi milikmu sendiri." }, 400);
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      target_user_id,
      { password: password_baru }
    );

    if (updateError) return jsonResponse({ error: updateError.message }, 400);

    // Catat ke log aktivitas — tidak pernah mencatat sandi baru itu sendiri
    const { data: targetInfo } = await supabaseAdmin
      .from("admin_users")
      .select("email")
      .eq("id", target_user_id)
      .maybeSingle();

    await supabaseAdmin.from("admin_activity_log").insert({
      dilakukan_oleh: userData.user.id,
      dilakukan_oleh_email: userData.user.email,
      aksi: "reset_password",
      target_user_id,
      target_email: targetInfo?.email || null,
    });

    return jsonResponse({ success: true });
  } catch (e) {
    return jsonResponse({ error: e?.message || "Terjadi kesalahan di server." }, 500);
  }
});
