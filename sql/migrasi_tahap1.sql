-- =========================================================
-- MIGRASI TAHAP 1 — Perluasan struktur HIMPALUBI
-- Aman dijalankan di database yang sudah berjalan.
-- Tidak menghapus data yang sudah ada.
-- Jalankan di: Supabase > SQL Editor > New query > Run
-- =========================================================

-- 1. Tabel ANGGOTA: tambah kategori (Pengurus/Anggota) & divisi
alter table anggota add column if not exists kategori text not null default 'Anggota';
alter table anggota add column if not exists divisi text;
-- kategori valid: 'Pengurus' (masuk Struktur Organisasi) atau 'Anggota' (masuk halaman Anggota)
-- divisi contoh: 'BPH', 'Divisi Humas', 'Divisi Pendidikan', dst (boleh kosong untuk Anggota biasa)

-- 2. Tabel BERITA: tambah kategori (Berita/Kegiatan)
alter table berita add column if not exists kategori text not null default 'Berita';
-- kategori valid: 'Berita' atau 'Kegiatan'

-- 3. Tabel baru: GALERI (foto lepas, diunggah admin)
create table if not exists galeri (
  id uuid primary key default gen_random_uuid(),
  judul text,
  foto_url text not null,
  tanggal date not null default current_date,
  created_at timestamptz not null default now()
);
alter table galeri enable row level security;
drop policy if exists "Publik bisa lihat galeri" on galeri;
create policy "Publik bisa lihat galeri" on galeri for select using (true);
drop policy if exists "Admin kelola galeri" on galeri;
create policy "Admin kelola galeri" on galeri
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 4. Tabel baru: PROGRAM KERJA (terikat ke divisi)
create table if not exists program_kerja (
  id uuid primary key default gen_random_uuid(),
  nama_program text not null,
  divisi text not null,
  deskripsi text,
  status text not null default 'Berjalan', -- Direncanakan / Berjalan / Selesai
  created_at timestamptz not null default now()
);
alter table program_kerja enable row level security;
drop policy if exists "Publik bisa lihat program kerja" on program_kerja;
create policy "Publik bisa lihat program kerja" on program_kerja for select using (true);
drop policy if exists "Admin kelola program kerja" on program_kerja;
create policy "Admin kelola program kerja" on program_kerja
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 5. Tabel baru: PENGATURAN (info organisasi, kontak, medsos — 1 baris saja)
create table if not exists pengaturan (
  id int primary key default 1,
  nama_organisasi text not null default 'HIMPALUBI',
  tagline text default 'Himpunan Mahasiswa Pendidikan Luar Biasa',
  tentang text default 'Tulis deskripsi organisasi di sini melalui menu Pengaturan pada dashboard admin.',
  alamat text,
  email text,
  telepon text,
  instagram text,
  youtube text,
  updated_at timestamptz not null default now(),
  constraint id_harus_satu check (id = 1)
);
alter table pengaturan enable row level security;
drop policy if exists "Publik bisa lihat pengaturan" on pengaturan;
create policy "Publik bisa lihat pengaturan" on pengaturan for select using (true);
drop policy if exists "Admin ubah pengaturan" on pengaturan;
create policy "Admin ubah pengaturan" on pengaturan
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Isi baris pengaturan default (hanya jika belum ada)
insert into pengaturan (id) values (1) on conflict (id) do nothing;
