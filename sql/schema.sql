-- =========================================================
-- SKEMA DATABASE HIMPALUBI
-- Jalankan seluruh file ini di Supabase: SQL Editor > New query
-- =========================================================

create table if not exists berita (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  isi text not null,
  tanggal date not null default current_date,
  penulis text,
  foto_url text,
  created_at timestamptz not null default now()
);

create table if not exists anggota (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  jabatan text,
  angkatan text,
  foto_url text,
  status text not null default 'Aktif',
  created_at timestamptz not null default now()
);

create table if not exists pendaftaran (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  nim text,
  program_studi text,
  angkatan text,
  no_wa text,
  email text,
  alasan text,
  status text not null default 'Menunggu',
  created_at timestamptz not null default now()
);

-- Nyalakan Row Level Security (RLS) supaya data terlindungi
alter table berita enable row level security;
alter table anggota enable row level security;
alter table pendaftaran enable row level security;

-- Publik boleh MELIHAT berita & anggota
create policy "Publik bisa lihat berita" on berita
  for select using (true);

create policy "Publik bisa lihat anggota" on anggota
  for select using (true);

-- Publik boleh MENGIRIM pendaftaran (tidak bisa melihat data orang lain)
create policy "Publik bisa mengirim pendaftaran" on pendaftaran
  for insert with check (true);

-- Hanya admin yang sudah login (authenticated) yang boleh
-- menambah / mengubah / menghapus berita & anggota
create policy "Admin kelola berita" on berita
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Admin kelola anggota" on anggota
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Hanya admin yang boleh melihat & mengubah data pendaftaran
create policy "Admin lihat pendaftaran" on pendaftaran
  for select using (auth.role() = 'authenticated');

create policy "Admin ubah status pendaftaran" on pendaftaran
  for update using (auth.role() = 'authenticated');

create policy "Admin hapus pendaftaran" on pendaftaran
  for delete using (auth.role() = 'authenticated');
