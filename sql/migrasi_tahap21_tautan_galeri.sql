-- =====================================================================
-- Tahap 21: Tautan video/postingan pada Galeri
--   Menambah 1 kolom opsional `tautan_url` di tabel galeri.
--   Dipakai agar gambar di Galeri bisa mengarah ke YouTube / Instagram / TikTok / tautan lain.
--   Dampak: hanya MENAMBAH kolom kosong (null). Foto dan data yang sudah ada tidak berubah.
--           Aturan akses (RLS) tidak berubah.
--   Rollback: sql/rollback_tahap21.sql (menghapus kolom ini; foto tetap aman)
-- =====================================================================

alter table public.galeri
  add column if not exists tautan_url text;

alter table public.galeri drop constraint if exists galeri_tautan_url_cek;
alter table public.galeri
  add constraint galeri_tautan_url_cek
  check (tautan_url is null or (tautan_url ~* '^https?://' and char_length(tautan_url) <= 500));
