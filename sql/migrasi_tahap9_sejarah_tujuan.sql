-- =========================================================
-- MIGRASI TAHAP 9 — Sejarah & Tujuan Organisasi
-- Aman dijalankan di database yang sudah berjalan. Tidak menghapus data.
-- Jalankan di: Supabase > SQL Editor > New query > Run
-- =========================================================

alter table pengaturan add column if not exists sejarah text;
alter table pengaturan add column if not exists tujuan text;
