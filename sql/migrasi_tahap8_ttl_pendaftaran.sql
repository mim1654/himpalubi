-- =========================================================
-- MIGRASI TAHAP 8 — Tambah Tempat Tanggal Lahir (TTL) di Pendaftaran
-- Aman dijalankan di database yang sudah berjalan. Tidak menghapus data.
-- Jalankan di: Supabase > SQL Editor > New query > Run
-- =========================================================

alter table pendaftaran add column if not exists tempat_lahir text;
alter table pendaftaran add column if not exists tanggal_lahir date;
