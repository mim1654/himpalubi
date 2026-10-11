-- =====================================================================
-- tahap 19: persetujuan data pribadi (K1) + batas kiriman formulir publik (K4)
--
-- Dampak (baca dulu):
--   1. Menambah kolom `setuju_pada` di tabel pendaftaran (nullable, data lama tidak berubah).
--   2. Menambah pemicu (trigger) yang MENOLAK kiriman baru bila terlalu banyak:
--        - aspirasi    : maks 30 kiriman / 10 menit untuk seluruh situs, maks 3 / jam per email
--        - pendaftaran : maks 60 kiriman / 10 menit untuk seluruh situs, maks 3 / jam per email
--      Data yang sudah ada TIDAK diubah. Jika sedang ada hari pendaftaran ramai, angka
--      60 bisa dinaikkan dengan menjalankan ulang fungsi di bawah (create or replace).
--   3. Cara pasang: jalankan SQL ini DULU, baru unggah file situs baru.
--   Rollback: sql/rollback_tahap19.sql
-- =====================================================================

alter table public.pendaftaran add column if not exists setuju_pada timestamptz;

create or replace function public.batasi_kiriman_publik()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  batas_global int;
  jumlah_global int;
  jumlah_email int;
begin
  if tg_table_name = 'aspirasi' then
    batas_global := 30;
    select count(*) into jumlah_global from public.aspirasi
      where created_at > now() - interval '10 minutes';
    select count(*) into jumlah_email from public.aspirasi
      where lower(email) = lower(new.email) and created_at > now() - interval '1 hour';
  elsif tg_table_name = 'pendaftaran' then
    batas_global := 60;
    select count(*) into jumlah_global from public.pendaftaran
      where created_at > now() - interval '10 minutes';
    select count(*) into jumlah_email from public.pendaftaran
      where lower(email) = lower(new.email) and created_at > now() - interval '1 hour';
  else
    return new;
  end if;

  if jumlah_global >= batas_global or jumlah_email >= 3 then
    raise exception 'Terlalu banyak kiriman. Coba lagi beberapa saat lagi.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.batasi_kiriman_publik() from public, anon, authenticated;

drop trigger if exists batasi_kiriman_aspirasi on public.aspirasi;
create trigger batasi_kiriman_aspirasi
  before insert on public.aspirasi
  for each row execute function public.batasi_kiriman_publik();

drop trigger if exists batasi_kiriman_pendaftaran on public.pendaftaran;
create trigger batasi_kiriman_pendaftaran
  before insert on public.pendaftaran
  for each row execute function public.batasi_kiriman_publik();
