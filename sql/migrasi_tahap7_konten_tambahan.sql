-- =========================================================
-- MIGRASI TAHAP 7 — Konten Tambahan (Statistik, Visi-Misi, FAQ, Testimoni)
-- Aman dijalankan di database yang sudah berjalan. Tidak menghapus data.
-- Jalankan di: Supabase > SQL Editor > New query > Run
-- =========================================================

-- 1. Field baru di pengaturan
alter table pengaturan add column if not exists tahun_berdiri text;
alter table pengaturan add column if not exists tagline_hero text;
alter table pengaturan add column if not exists visi text;
alter table pengaturan add column if not exists misi text;

-- 2. Tabel FAQ
create table if not exists faq (
  id uuid primary key default gen_random_uuid(),
  pertanyaan text not null,
  jawaban text not null,
  urutan int,
  created_at timestamptz not null default now()
);
alter table faq enable row level security;
drop policy if exists "Publik bisa lihat faq" on faq;
create policy "Publik bisa lihat faq" on faq for select using (true);
drop policy if exists "Admin kelola faq" on faq;
create policy "Admin kelola faq" on faq
  for all using (public.is_admin()) with check (public.is_admin());

-- 3. Tabel Testimoni
create table if not exists testimoni (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  jabatan text,
  isi text not null,
  foto_url text,
  urutan int,
  created_at timestamptz not null default now()
);
alter table testimoni enable row level security;
drop policy if exists "Publik bisa lihat testimoni" on testimoni;
create policy "Publik bisa lihat testimoni" on testimoni for select using (true);
drop policy if exists "Admin kelola testimoni" on testimoni;
create policy "Admin kelola testimoni" on testimoni
  for all using (public.is_admin()) with check (public.is_admin());
