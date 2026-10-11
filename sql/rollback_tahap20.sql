-- Rollback tahap 20: menghapus tabel Mitra & Lokasi beserta isinya (lokasi, UKM, tautan kampus).
drop table if exists public.mitra_tautan;
