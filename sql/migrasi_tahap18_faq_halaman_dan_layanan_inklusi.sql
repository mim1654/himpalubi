-- =========================================================
-- MIGRASI TAHAP 18 — FAQ per halaman + Layanan Inklusi bisa diedit dari dashboard
--
--   faq.halaman                       : 'tentang' | 'kegiatan' | 'semua'  (nilai lama = 'tentang')
--   pengaturan.layanan_judul          : judul kotak "Layanan Fasilitas Inklusi" di halaman Kegiatan
--   pengaturan.layanan_deskripsi      : paragraf penjelasan
--   pengaturan.layanan_fasilitas      : daftar fasilitas, satu baris = satu poin
--   pengaturan.layanan_kontak_label   : label narahubung
--   pengaturan.layanan_whatsapp       : nomor WhatsApp narahubung (boleh format 0812-xxxx)
--
-- Nilai awal = teks yang tampil di halaman Kegiatan sekarang, jadi tampilan tidak berubah
-- sampai Anda mengeditnya. 4 pertanyaan Kegiatan dimasukkan ke tabel faq supaya bisa
-- diedit/dihapus dari dashboard. PERIKSA ISI JAWABANNYA (angka dan aturan harus benar).
--
-- Aman dijalankan pada database yang sudah berjalan: hanya MENAMBAH kolom/baris,
-- tidak mengubah data lama. Satu transaksi, bisa diulang.
-- Pembatalan: sql/rollback_tahap18.sql
-- Jalankan di: Supabase > SQL Editor > New query > Run
-- =========================================================

begin;

alter table faq add column if not exists halaman text not null default 'tentang';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'faq_halaman_check') then
    alter table faq add constraint faq_halaman_check check (halaman in ('tentang', 'kegiatan', 'semua'));
  end if;
end $$;

alter table pengaturan add column if not exists layanan_judul text;
alter table pengaturan add column if not exists layanan_deskripsi text;
alter table pengaturan add column if not exists layanan_fasilitas text;
alter table pengaturan add column if not exists layanan_kontak_label text;
alter table pengaturan add column if not exists layanan_whatsapp text;

update pengaturan set
  layanan_judul = coalesce(layanan_judul, $$Memerlukan Akomodasi Khusus atau Juru Bahasa Isyarat (JBI)?$$),
  layanan_deskripsi = coalesce(layanan_deskripsi, $$HIMPALUBI menjamin setiap kegiatan ramah dan aksesibel bagi kawan difabel (Tuli, Netra, Daksa, Neurodivergen). Kami menyediakan pendamping relawan, modul cetak braille, deskripsi audio, dan JBI tanpa dipungut biaya.$$),
  layanan_fasilitas = coalesce(layanan_fasilitas, $$Juru Bahasa Isyarat (BISINDO) di panggung & Zoom
Akses jalur ramp kursi roda & tempat duduk prioritas
Modul materi ramah pembaca layar (screen reader)$$),
  layanan_kontak_label = coalesce(layanan_kontak_label, 'Narahubung Advokasi Inklusi'),
  layanan_whatsapp = coalesce(layanan_whatsapp, '081234634724')
where id = 1;

insert into faq (pertanyaan, jawaban, urutan, halaman)
select $$Bagaimana alur pendaftaran kegiatan dan konfirmasi tiket?$$, $$Pendaftaran dilakukan secara daring melalui formulir resmi di website ini. Setelah submit data diri dan bukti pendukung (KTM untuk mahasiswa UNIPAR), konfirmasi dan tautan grup koordinasi akan dikirimkan ke email terdaftar maksimal 1x24 jam.$$, 1, 'kegiatan'
where not exists (select 1 from faq where halaman = 'kegiatan' and pertanyaan = $$Bagaimana alur pendaftaran kegiatan dan konfirmasi tiket?$$);

insert into faq (pertanyaan, jawaban, urutan, halaman)
select $$Kapan e-sertifikat kegiatan dapat diunduh?$$, $$E-sertifikat ber-SKP resmi diterbitkan maksimal 3 hari kerja setelah kegiatan selesai, bersyarat peserta telah mengisi kuesioner evaluasi dan presensi kehadiran penuh (minimal 85% untuk workshop bersesi).$$, 2, 'kegiatan'
where not exists (select 1 from faq where halaman = 'kegiatan' and pertanyaan = $$Kapan e-sertifikat kegiatan dapat diunduh?$$);

insert into faq (pertanyaan, jawaban, urutan, halaman)
select $$Apakah mahasiswa dari luar program studi PLB boleh berpartisipasi?$$, $$Sebagian besar agenda seminar nasional, workshop media edukatif, dan pelatihan bahasa isyarat terbuka untuk seluruh sivitas akademika UNIPAR maupun perguruan tinggi umum. Agenda internal (seperti LKMM-TD) diprioritaskan bagi mahasiswa aktif PLB UNIPAR.$$, 3, 'kegiatan'
where not exists (select 1 from faq where halaman = 'kegiatan' and pertanyaan = $$Apakah mahasiswa dari luar program studi PLB boleh berpartisipasi?$$);

insert into faq (pertanyaan, jawaban, urutan, halaman)
select $$Bagaimana prosedur menjadi relawan kepanitiaan?$$, $$Perekrutan relawan (open recruitment volunteer) diumumkan 3 minggu sebelum acara melalui portal himpunan dan Instagram resmi. Mahasiswa aktif dapat mendaftar melalui menu pendaftaran di website.$$, 4, 'kegiatan'
where not exists (select 1 from faq where halaman = 'kegiatan' and pertanyaan = $$Bagaimana prosedur menjadi relawan kepanitiaan?$$);

commit;
