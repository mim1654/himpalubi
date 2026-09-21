-- =========================================================
-- MIGRASI TAHAP 11 — Storage Foto & Teks Berjalan
-- Aman dijalankan di database yang sudah berjalan. Tidak menghapus data.
-- Jalankan di: Supabase > SQL Editor > New query > Run
--
-- PENTING: sebelum menjalankan file ini, buat dulu bucket "foto" lewat
-- Supabase Dashboard > Storage > New bucket (nama: foto, Public: ON).
-- Lihat panduan lengkap dari Claude di chat.
-- =========================================================

-- 1. Kebijakan Storage: publik boleh lihat foto, hanya admin boleh upload/hapus
drop policy if exists "Publik bisa lihat foto" on storage.objects;
create policy "Publik bisa lihat foto" on storage.objects
  for select using (bucket_id = 'foto');

drop policy if exists "Admin bisa upload foto" on storage.objects;
create policy "Admin bisa upload foto" on storage.objects
  for insert with check (bucket_id = 'foto' and public.is_admin());

drop policy if exists "Admin bisa hapus foto" on storage.objects;
create policy "Admin bisa hapus foto" on storage.objects
  for delete using (bucket_id = 'foto' and public.is_admin());

-- 2. Field teks berjalan (manual) di Pengaturan
alter table pengaturan add column if not exists teks_berjalan text;
