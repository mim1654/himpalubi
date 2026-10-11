-- Rollback tahap 19: hapus pemicu dan fungsi pembatas kiriman.
drop trigger if exists batasi_kiriman_aspirasi on public.aspirasi;
drop trigger if exists batasi_kiriman_pendaftaran on public.pendaftaran;
drop function if exists public.batasi_kiriman_publik();

-- Kolom persetujuan sengaja TIDAK dihapus agar bukti persetujuan pendaftar tidak hilang.
-- Jika benar-benar ingin menghapusnya (data persetujuan ikut hilang), hapus tanda komentar di bawah:
-- alter table public.pendaftaran drop column if exists setuju_pada;
