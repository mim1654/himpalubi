-- Rollback tahap 22: menghapus tabel Info Lomba beserta seluruh isinya (lomba dan kategori).
-- Jalankan hanya jika ingin membatalkan fitur lomba. Data lomba yang sudah diisi akan hilang.
drop table if exists public.lomba_kategori;
drop table if exists public.lomba;
