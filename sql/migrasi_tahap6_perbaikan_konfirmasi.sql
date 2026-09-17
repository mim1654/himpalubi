-- =========================================================
-- MIGRASI TAHAP 6 — Perbaikan Konfirmasi Email Admin Undangan
-- Aman dijalankan di database yang sudah berjalan. Tidak menghapus data.
-- Jalankan di: Supabase > SQL Editor > New query > Run
-- =========================================================

-- PERBAIKAN A — Konfirmasi manual akun yang sudah telanjur nyangkut.
-- Ganti email di bawah kalau ada admin lain yang mengalami hal sama.
update auth.users
set email_confirmed_at = now()
where email = 'rosabunga113@gmail.com' and email_confirmed_at is null;

-- PERBAIKAN B — Mulai sekarang, siapa pun yang daftar lewat admin/daftar.html
-- dengan email yang SUDAH DIUNDANG akan otomatis dianggap terkonfirmasi,
-- jadi tidak perlu klik link email lagi sebelum bisa login.
-- (Email yang TIDAK diundang tetap tidak dapat akses apa pun, jadi ini aman.)
create or replace function public.cek_undangan_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from admin_undangan where email = new.email) then
    insert into admin_users (id, email) values (new.id, new.email)
    on conflict (id) do nothing;
    delete from admin_undangan where email = new.email;

    -- Lewati kebutuhan verifikasi email untuk admin yang memang sudah diundang
    update auth.users set email_confirmed_at = now()
    where id = new.id and email_confirmed_at is null;
  end if;
  return new;
end;
$$;

-- Catatan: trigger "on_auth_user_created_cek_undangan" yang sudah ada dari
-- migrasi_tahap4 TIDAK perlu dibuat ulang — dia otomatis memakai versi
-- fungsi terbaru ini begitu di-update di atas.
