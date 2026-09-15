-- =========================================================
-- MIGRASI TAHAP 3 — KEAMANAN
-- Membatasi akses admin dari "siapa saja yang berhasil login"
-- menjadi "hanya user yang terdaftar resmi di tabel admin_users".
-- Aman dijalankan di database yang sudah berjalan. Tidak menghapus data.
-- Jalankan di: Supabase > SQL Editor > New query > Run
-- =========================================================

-- 1. Tabel daftar admin resmi
create table if not exists admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  dibuat_pada timestamptz not null default now()
);
alter table admin_users enable row level security;

-- Fungsi bantu untuk mengecek status admin.
-- SECURITY DEFINER: supaya pengecekan ini tidak terjebak RLS berulang
-- saat dipakai di dalam policy tabel lain.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from admin_users where id = auth.uid());
$$;

drop policy if exists "Admin bisa lihat daftar admin" on admin_users;
create policy "Admin bisa lihat daftar admin" on admin_users
  for select using (public.is_admin());

-- =========================================================
-- 2. Ganti syarat SEMUA policy admin: dari sekadar "sudah login"
--    menjadi "terdaftar resmi di admin_users"
-- =========================================================

-- BERITA (juga dipakai untuk Kegiatan, kategori berbeda)
drop policy if exists "Admin kelola berita" on berita;
create policy "Admin kelola berita" on berita
  for all using (public.is_admin()) with check (public.is_admin());

-- ANGGOTA (juga dipakai untuk Struktur Pengurus, kategori berbeda)
drop policy if exists "Admin kelola anggota" on anggota;
create policy "Admin kelola anggota" on anggota
  for all using (public.is_admin()) with check (public.is_admin());

-- GALERI
drop policy if exists "Admin kelola galeri" on galeri;
create policy "Admin kelola galeri" on galeri
  for all using (public.is_admin()) with check (public.is_admin());

-- PROGRAM KERJA
drop policy if exists "Admin kelola program kerja" on program_kerja;
create policy "Admin kelola program kerja" on program_kerja
  for all using (public.is_admin()) with check (public.is_admin());

-- PENGATURAN
drop policy if exists "Admin ubah pengaturan" on pengaturan;
create policy "Admin ubah pengaturan" on pengaturan
  for update using (public.is_admin()) with check (public.is_admin());

-- PENDAFTARAN
drop policy if exists "Admin lihat pendaftaran" on pendaftaran;
create policy "Admin lihat pendaftaran" on pendaftaran
  for select using (public.is_admin());

drop policy if exists "Admin ubah status pendaftaran" on pendaftaran;
create policy "Admin ubah status pendaftaran" on pendaftaran
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admin hapus pendaftaran" on pendaftaran;
create policy "Admin hapus pendaftaran" on pendaftaran
  for delete using (public.is_admin());

-- =========================================================
-- 3. WAJIB — daftarkan akun admin yang SUDAH ADA sekarang.
--    GANTI 'EMAIL_ADMIN_KAMU' di bawah dengan email admin yang sudah
--    kamu buat sebelumnya (lihat di Authentication > Users), SEBELUM
--    menjalankan file ini. Kalau dilewati, admin lama akan langsung
--    terkunci keluar dari dashboard setelah migrasi ini berjalan.
-- =========================================================
insert into admin_users (id, email)
select id, email from auth.users where email = 'EMAIL_ADMIN_KAMU'
on conflict (id) do nothing;
