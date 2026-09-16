-- =========================================================
-- MIGRASI TAHAP 5 — Admin Utama & Riwayat Aktivitas
-- Aman dijalankan di database yang sudah berjalan. Tidak menghapus data.
-- Jalankan di: Supabase > SQL Editor > New query > Run
-- =========================================================

-- 1. Tambah kolom peran ke admin_users
alter table admin_users add column if not exists peran text not null default 'admin';
-- peran: 'utama' (admin utama — akses penuh, termasuk reset sandi admin lain)
--        'admin' (admin biasa)

-- GANTI email di bawah kalau bukan ini. Kalau baris tidak berubah (0 rows),
-- berarti email ini belum ada di admin_users — pastikan sudah pernah login
-- minimal sekali dan terdaftar (lihat migrasi_tahap3_keamanan.sql) dulu,
-- baru jalankan ulang baris UPDATE ini.
update admin_users set peran = 'utama' where email = 'ilmanmubarok16@gmail.com';

-- 2. Fungsi bantu: cek apakah pemanggil adalah admin UTAMA
create or replace function public.is_admin_utama()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from admin_users where id = auth.uid() and peran = 'utama');
$$;

-- 3. Perbarui izin di admin_users:
--    - SELECT tetap untuk semua admin (kebijakan lama dari migrasi_tahap3 dipakai lagi)
--    - UPDATE/DELETE hanya untuk admin utama
drop policy if exists "Admin bisa cabut akses admin" on admin_users;
drop policy if exists "Admin utama bisa hapus admin" on admin_users;
create policy "Admin utama bisa hapus admin" on admin_users
  for delete using (public.is_admin_utama());

drop policy if exists "Admin utama bisa update admin" on admin_users;
create policy "Admin utama bisa update admin" on admin_users
  for update using (public.is_admin_utama()) with check (public.is_admin_utama());

-- 4. Undangan admin: batasi kelola undangan hanya untuk admin utama juga,
--    supaya seluruh menu "Kelola Admin" konsisten khusus admin utama.
drop policy if exists "Admin kelola undangan" on admin_undangan;
create policy "Admin utama kelola undangan" on admin_undangan
  for all using (public.is_admin_utama()) with check (public.is_admin_utama());

-- 5. Tabel riwayat aktivitas reset sandi (untuk transparansi/akuntabilitas)
create table if not exists admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  dilakukan_oleh uuid,
  dilakukan_oleh_email text,
  aksi text not null,
  target_user_id uuid,
  target_email text,
  waktu timestamptz not null default now()
);
alter table admin_activity_log enable row level security;

drop policy if exists "Admin utama bisa lihat log aktivitas" on admin_activity_log;
create policy "Admin utama bisa lihat log aktivitas" on admin_activity_log
  for select using (public.is_admin_utama());

-- Catatan: tidak ada policy INSERT di sini secara sengaja — baris log hanya
-- ditambahkan lewat Edge Function (pakai service_role, otomatis lewat RLS).
