-- =========================================================
-- MIGRASI TAHAP 16 — TikTok & Jam Layanan Piket di Pengaturan
--
--   pengaturan.tiktok       : tautan TikTok (muncul di beranda, footer, halaman Kontak)
--   pengaturan.jam_layanan  : teks "Jam Layanan Piket" di kartu Sekretariat beranda
--                             (nilai awal = teks yang tampil sekarang)
--
-- Aman dijalankan pada database yang sudah berjalan: hanya MENAMBAH 2 kolom,
-- tidak mengubah/menghapus data. Satu transaksi, bisa diulang.
-- Pembatalan: sql/rollback_tahap16.sql
-- Jalankan di: Supabase > SQL Editor > New query > Run
-- =========================================================

begin;

alter table pengaturan add column if not exists tiktok text;
alter table pengaturan add column if not exists jam_layanan text default 'Senin - Jumat: 09.00 - 17.00 WIB';

commit;
