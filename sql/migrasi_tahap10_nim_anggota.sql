-- =========================================================
-- MIGRASI TAHAP 10 — Kolom NIM di Anggota
-- Aman dijalankan di database yang sudah berjalan. Tidak menghapus data.
-- Jalankan di: Supabase > SQL Editor > New query > Run
-- =========================================================

alter table anggota add column if not exists nim text;
