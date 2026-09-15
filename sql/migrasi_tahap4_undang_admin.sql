-- =========================================================
-- MIGRASI TAHAP 4 — Fitur "Undang Admin" (self-service)
-- Aman dijalankan di database yang sudah berjalan. Tidak menghapus data.
-- Jalankan di: Supabase > SQL Editor > New query > Run
-- =========================================================

-- 1. Tabel daftar undangan yang masih menunggu diklaim
create table if not exists admin_undangan (
  email text primary key,
  diundang_oleh text,
  dibuat_pada timestamptz not null default now()
);
alter table admin_undangan enable row level security;

drop policy if exists "Admin kelola undangan" on admin_undangan;
create policy "Admin kelola undangan" on admin_undangan
  for all using (public.is_admin()) with check (public.is_admin());

-- 2. Trigger: begitu ada akun baru daftar (auth.users), cek apakah emailnya
--    ada di daftar undangan. Kalau ada, otomatis jadikan admin dan hapus
--    undangannya (sekali pakai). Kalau tidak ada di undangan, tidak terjadi
--    apa-apa — akun itu tetap tidak punya akses admin apa pun.
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
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_cek_undangan on auth.users;
create trigger on_auth_user_created_cek_undangan
  after insert on auth.users
  for each row execute function public.cek_undangan_admin();

-- 3. Izinkan admin untuk melihat & mencabut akses admin lain
--    (kebijakan "Admin bisa lihat daftar admin" dari migrasi_tahap3 sudah
--    ada untuk SELECT; ini menambah izin DELETE)
drop policy if exists "Admin bisa cabut akses admin" on admin_users;
create policy "Admin bisa cabut akses admin" on admin_users
  for delete using (public.is_admin());
