-- =========================================================
-- ROLLBACK TAHAP 18
-- Menghapus FAQ khusus halaman Kegiatan (yang ditambahkan lewat tahap 18 atau dashboard),
-- lalu menghapus kolom baru. FAQ halaman Tentang tidak disentuh.
-- PERHATIAN: isi Layanan Inklusi yang sudah Anda ubah ikut hilang.
-- =========================================================

begin;

delete from faq where halaman in ('kegiatan', 'semua');
alter table faq drop constraint if exists faq_halaman_check;
alter table faq drop column if exists halaman;

alter table pengaturan drop column if exists layanan_judul;
alter table pengaturan drop column if exists layanan_deskripsi;
alter table pengaturan drop column if exists layanan_fasilitas;
alter table pengaturan drop column if exists layanan_kontak_label;
alter table pengaturan drop column if exists layanan_whatsapp;

commit;
