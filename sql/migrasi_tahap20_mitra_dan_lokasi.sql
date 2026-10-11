-- =====================================================================
-- Tahap 20: Mitra & Lokasi
--   Satu tabel untuk tiga jenis data yang tampil di website:
--     lokasi : lokasi kampus (peta Google Maps di halaman Kontak)
--     ukm    : logo UKM + tautan Instagram (pita di atas footer)
--     tautan : tautan situs kampus (Universitas, FKIP, PLB, SIAKAD)
--   Dampak: hanya MENAMBAH tabel baru. Data yang sudah ada tidak diubah.
--   Awal hanya berisi 2 data yang alamatnya sudah pasti (Kampus 1 dan situs universitas).
--   Sisanya (Kampus 2, UKM, FKIP, PLB, SIAKAD) diisi dari Dashboard > Mitra & Lokasi.
--   Rollback: sql/rollback_tahap20.sql
-- =====================================================================

create table if not exists public.mitra_tautan (
  id uuid primary key default gen_random_uuid(),
  jenis text not null check (jenis in ('lokasi', 'ukm', 'tautan')),
  nama text not null check (char_length(nama) between 1 and 120),
  url text check (url is null or url ~* '^https?://'),
  keterangan text check (keterangan is null or char_length(keterangan) <= 300),
  logo_url text,
  urutan integer,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists mitra_tautan_jenis_urutan_idx on public.mitra_tautan (jenis, urutan);

alter table public.mitra_tautan enable row level security;

drop policy if exists "Publik bisa lihat mitra aktif" on public.mitra_tautan;
create policy "Publik bisa lihat mitra aktif" on public.mitra_tautan
  for select using (aktif = true);

drop policy if exists "Admin kelola mitra" on public.mitra_tautan;
create policy "Admin kelola mitra" on public.mitra_tautan
  using (public.is_admin()) with check (public.is_admin());

revoke all on table public.mitra_tautan from anon, authenticated;
grant select on table public.mitra_tautan to anon;
grant select, insert, update, delete on table public.mitra_tautan to authenticated;

-- Data awal (aman dijalankan ulang: tidak menambah jika nama dan jenis yang sama sudah ada)
insert into public.mitra_tautan (jenis, nama, keterangan, urutan)
select 'lokasi', 'Kampus 1', 'Gedung PKM Kampus 1 Universitas PGRI Argopuro Jember, Jl. Jawa No. 10, Jember, Jawa Timur', 1
where not exists (select 1 from public.mitra_tautan where jenis = 'lokasi' and nama = 'Kampus 1');

insert into public.mitra_tautan (jenis, nama, url, keterangan, urutan)
select 'tautan', 'Universitas PGRI Argopuro Jember', 'https://unipar.ac.id/', 'Situs resmi universitas', 1
where not exists (select 1 from public.mitra_tautan where jenis = 'tautan' and nama = 'Universitas PGRI Argopuro Jember');
