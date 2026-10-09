-- =========================================================
-- MIGRASI TAHAP 15 — Kategori kegiatan & label yang bisa diubah dari Pengaturan
--
--   1. berita.jenis_kegiatan: kategori kegiatan (inklusi, seminar, pengabdian,
--      kaderisasi, kompetisi) agar tombol kategori di halaman Kegiatan berfungsi.
--      Kolom ini boleh kosong; data lama tidak berubah.
--   2. pengaturan.akreditasi_label, akreditasi_periode, periode_kepengurusan:
--      teks "Akreditasi Unggul", "2025/2026", dan "KEPENGURUSAN 2025/2026" di
--      beranda kini bisa diubah di Dashboard > Pengaturan. Nilai awal sama
--      persis dengan teks yang tampil sekarang, jadi tampilan tidak berubah.
--
-- Aman dijalankan pada database yang sudah berjalan: hanya MENAMBAH kolom,
-- tidak mengubah/menghapus data. Satu transaksi, bisa diulang.
-- Pembatalan: sql/rollback_tahap15.sql
-- Jalankan di: Supabase > SQL Editor > New query > Run
-- =========================================================

begin;

alter table berita add column if not exists jenis_kegiatan text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'berita_jenis_kegiatan_check') then
    alter table berita add constraint berita_jenis_kegiatan_check
      check (jenis_kegiatan is null or jenis_kegiatan in ('inklusi', 'seminar', 'pengabdian', 'kaderisasi', 'kompetisi'));
  end if;
end $$;

alter table pengaturan add column if not exists akreditasi_label text default 'Akreditasi Unggul';
alter table pengaturan add column if not exists akreditasi_periode text default '2025/2026';
alter table pengaturan add column if not exists periode_kepengurusan text default '2025/2026';

commit;
