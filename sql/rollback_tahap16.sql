-- =========================================================
-- ROLLBACK TAHAP 16
-- Menghapus kolom tiktok dan jam_layanan dari tabel pengaturan.
-- PERHATIAN: tautan TikTok dan jam layanan yang sudah diisi ikut hilang.
-- Data lain tidak disentuh.
-- =========================================================

begin;

alter table pengaturan drop column if exists tiktok;
alter table pengaturan drop column if exists jam_layanan;

commit;
