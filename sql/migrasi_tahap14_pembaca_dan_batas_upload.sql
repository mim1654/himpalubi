-- =========================================================
-- MIGRASI TAHAP 14 — Penghitung pembaca di server & batas upload foto
--
--   1. Kolom "views" di tabel berita + fungsi tambah_pembaca(id): jumlah
--      pembaca tersimpan di server (sebelumnya hanya di browser masing-masing).
--      Pengunjung hanya bisa MENAMBAH 1 lewat fungsi ini, tidak bisa menulis
--      angka sendiri.
--   2. Bucket "foto": maksimal 5 MB per file dan hanya JPEG (situs memang
--      selalu mengunggah JPEG hasil kompresi). Foto yang sudah ada tidak berubah.
--
-- Aman dijalankan pada database yang sudah berjalan:
--   - Tidak menghapus/mengubah data berita, anggota, pendaftaran, dll.
--   - Pengaturan bucket lama disalin dulu ke cadangan.bucket_sebelum_t14.
--   - Satu transaksi: gagal di tengah = tidak ada yang berubah. Bisa diulang.
-- Pembatalan: sql/rollback_tahap14.sql
-- Jalankan di: Supabase > SQL Editor > New query > Run
-- =========================================================

begin;

-- Cadangan pengaturan bucket lama (tidak ditimpa jika dijalankan ulang)
create schema if not exists cadangan;
create table if not exists cadangan.bucket_sebelum_t14 as
  select id, public, file_size_limit, allowed_mime_types
  from storage.buckets where id = 'foto';
alter table cadangan.bucket_sebelum_t14 enable row level security;

-- 1. Penghitung pembaca ------------------------------------------------
alter table berita add column if not exists views integer not null default 0;

create or replace function public.tambah_pembaca(p_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  update berita set views = views + 1 where id = p_id returning views;
$$;

revoke all on function public.tambah_pembaca(uuid) from public;
grant execute on function public.tambah_pembaca(uuid) to anon, authenticated;

-- 2. Batas upload foto ---------------------------------------------------
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg']
where id = 'foto';

commit;
