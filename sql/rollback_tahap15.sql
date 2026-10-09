-- =========================================================
-- ROLLBACK TAHAP 15
-- Menghapus kolom kategori kegiatan dan label Pengaturan yang ditambahkan tahap 15.
-- PERHATIAN: kategori kegiatan yang sudah diisi dan label yang sudah diubah ikut hilang.
-- Data lain tidak disentuh.
-- =========================================================

begin;

alter table berita drop constraint if exists berita_jenis_kegiatan_check;
alter table berita drop column if exists jenis_kegiatan;

alter table pengaturan drop column if exists akreditasi_label;
alter table pengaturan drop column if exists akreditasi_periode;
alter table pengaturan drop column if exists periode_kepengurusan;

commit;
