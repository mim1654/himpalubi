-- Rollback Tahap 21: kembalikan tabel galeri seperti semula.
-- Dampak: tautan yang sudah diisi di Galeri ikut terhapus (foto dan judul tetap ada).
alter table public.galeri drop constraint if exists galeri_tautan_url_cek;
alter table public.galeri drop column if exists tautan_url;
