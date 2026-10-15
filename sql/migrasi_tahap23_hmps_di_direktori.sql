-- Tahap 23: Direktori HMPS di tabel mitra_tautan
-- Tabel yang sama dipakai untuk direktori UKM, lokasi kampus, dan tautan.
-- RLS dan kebijakan akses yang ada tidak diubah.

alter table public.mitra_tautan
  drop constraint if exists mitra_tautan_jenis_check;

alter table public.mitra_tautan
  add constraint mitra_tautan_jenis_check
  check (jenis in ('lokasi', 'ukm', 'hmps', 'tautan'));
