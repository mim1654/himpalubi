-- =====================================================================
-- Tahap 22: Info Lomba (daftar lomba + kategori)
--   Dampak: hanya MENAMBAH dua tabel baru (lomba, lomba_kategori). Data lama tidak diubah.
--   Pengunjung (anon) hanya boleh MEMBACA lomba/kategori yang aktif. Tidak bisa menulis.
--   Admin (public.is_admin()) boleh membaca, menambah, mengubah, dan menghapus.
--   Tautan juknis dan formulir dibatasi di database: hanya Google Drive/Docs dan Google Forms.
--   Tidak ada data peserta di sini: pendaftaran memakai Google Form (jawaban masuk Google Sheet).
--   Tidak ada data awal (tidak ada lomba contoh yang dikarang).
--   Rollback: sql/rollback_tahap22.sql (menghapus kedua tabel beserta isinya)
-- =====================================================================

create table if not exists public.lomba (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  judul text not null check (char_length(judul) between 1 and 160),
  ringkasan text check (ringkasan is null or char_length(ringkasan) <= 300),
  deskripsi text check (deskripsi is null or char_length(deskripsi) <= 8000),
  poster_url text check (poster_url is null or poster_url ~* '^https?://'),
  tanggal_buka date,
  tanggal_tutup date,
  tanggal_acara date,
  lokasi text check (lokasi is null or char_length(lokasi) <= 200),
  kontak text check (kontak is null or char_length(kontak) <= 200),
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  check (tanggal_buka is null or tanggal_tutup is null or tanggal_tutup >= tanggal_buka)
);

create table if not exists public.lomba_kategori (
  id uuid primary key default gen_random_uuid(),
  lomba_id uuid not null references public.lomba(id) on delete cascade,
  nama text not null check (char_length(nama) between 1 and 120),
  deskripsi text check (deskripsi is null or char_length(deskripsi) <= 2000),
  syarat text check (syarat is null or char_length(syarat) <= 3000),
  biaya text check (biaya is null or char_length(biaya) <= 80),
  kuota integer check (kuota is null or kuota >= 0),
  juknis_url text check (juknis_url is null or juknis_url ~* '^https://(drive|docs)\.google\.com/'),
  form_url text check (form_url is null or form_url ~* '^https://(docs\.google\.com/forms/|forms\.gle/|forms\.google\.com/)'),
  urutan integer,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists lomba_aktif_acara_idx on public.lomba (aktif, tanggal_acara);
create index if not exists lomba_kategori_lomba_idx on public.lomba_kategori (lomba_id, urutan);

alter table public.lomba enable row level security;
alter table public.lomba_kategori enable row level security;

drop policy if exists "Publik bisa lihat lomba aktif" on public.lomba;
create policy "Publik bisa lihat lomba aktif" on public.lomba
  for select using (aktif = true);

drop policy if exists "Admin kelola lomba" on public.lomba;
create policy "Admin kelola lomba" on public.lomba
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Publik bisa lihat kategori lomba aktif" on public.lomba_kategori;
create policy "Publik bisa lihat kategori lomba aktif" on public.lomba_kategori
  for select using (
    aktif = true
    and exists (select 1 from public.lomba l where l.id = lomba_id and l.aktif = true)
  );

drop policy if exists "Admin kelola kategori lomba" on public.lomba_kategori;
create policy "Admin kelola kategori lomba" on public.lomba_kategori
  using (public.is_admin()) with check (public.is_admin());

revoke all on table public.lomba from anon, authenticated;
revoke all on table public.lomba_kategori from anon, authenticated;
grant select on table public.lomba to anon;
grant select on table public.lomba_kategori to anon;
grant select, insert, update, delete on table public.lomba to authenticated;
grant select, insert, update, delete on table public.lomba_kategori to authenticated;
