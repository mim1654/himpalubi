-- =========================================================
-- MIGRASI TAHAP 17 — Hasil audit
--
--   1. NIM anggota tidak lagi bisa dibaca publik (hanya admin).
--   2. Tabel `aspirasi` untuk formulir "Hubungi HIMPALUBI" di beranda
--      (sebelumnya formulir itu hanya menampilkan pesan "terkirim" palsu).
--   3. Pendaftaran anggota: format NIM, No. WA, email, dan tanggal lahir
--      diperiksa juga di server (bukan hanya di browser).
--
-- URUTAN PENTING:
--   (1) Unggah dulu js/public.js & index.html versi baru ke GitHub Pages
--       (versi lama masih membaca kolom NIM dan akan error setelah langkah ini).
--   (2) Baru jalankan file ini di Supabase > SQL Editor > New query > Run.
--
-- Aman: satu transaksi (gagal di tengah = tidak ada yang berubah), tidak
-- menghapus data, bisa dijalankan berulang. Pembatalan: rollback_tahap17.sql
-- =========================================================

begin;

-- 1. NIM anggota: tutup untuk publik --------------------------------------
--    Admin (role authenticated) tetap bisa membaca semua kolom.
revoke select on public.anggota from anon;
grant select (id, nama, jabatan, angkatan, foto_url, status, kategori, divisi, urutan)
  on public.anggota to anon;

-- 2. Tabel aspirasi --------------------------------------------------------
create table if not exists public.aspirasi (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  email text not null,
  kategori text not null default 'umum',
  pesan text not null,
  dibaca boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.aspirasi enable row level security;

drop policy if exists "Publik bisa kirim aspirasi" on public.aspirasi;
create policy "Publik bisa kirim aspirasi" on public.aspirasi
  for insert
  with check (
    char_length(btrim(nama)) between 1 and 100
    and char_length(email) between 5 and 254
    and email like '%_@_%._%'
    and kategori in ('advokasi', 'kegiatan', 'kolaborasi', 'umum')
    and char_length(btrim(pesan)) between 5 and 2000
    and dibaca = false
  );

drop policy if exists "Admin lihat aspirasi" on public.aspirasi;
create policy "Admin lihat aspirasi" on public.aspirasi
  for select using (public.is_admin());

drop policy if exists "Admin ubah aspirasi" on public.aspirasi;
create policy "Admin ubah aspirasi" on public.aspirasi
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admin hapus aspirasi" on public.aspirasi;
create policy "Admin hapus aspirasi" on public.aspirasi
  for delete using (public.is_admin());

grant insert on public.aspirasi to anon;
grant select, update, delete on public.aspirasi to authenticated;

-- 3. Pendaftaran: validasi format di server (melengkapi tahap 13) ----------
drop policy if exists "Publik bisa mengirim pendaftaran" on public.pendaftaran;
create policy "Publik bisa mengirim pendaftaran" on public.pendaftaran
  for insert
  with check (
    status = 'Menunggu'
    and char_length(btrim(nama)) between 1 and 100
    and nim ~ '^[A-Za-z0-9]{6,20}$'
    and char_length(coalesce(program_studi, '')) <= 100
    and char_length(coalesce(angkatan, '')) <= 10
    and char_length(coalesce(tempat_lahir, '')) <= 100
    and (tanggal_lahir is null or tanggal_lahir between date '1940-01-01' and current_date)
    and no_wa ~ '^(\+62|62|0)8[0-9]{8,12}$'
    and email like '%_@_%._%'
    and char_length(email) <= 254
    and char_length(coalesce(alasan, '')) <= 2000
    and created_at >= now() - interval '10 minutes'
    and created_at <= now() + interval '1 minute'
  );

commit;

-- =========================================================
-- OPSIONAL (jalankan terpisah, SETELAH bagian di atas berhasil):
-- Pastikan NIM pendaftar unik. Lihat dulu apakah ada duplikat:
--
--   select nim, count(*) from pendaftaran
--   where nim is not null and nim <> '' group by nim having count(*) > 1;
--
-- Jika hasilnya kosong DAN migrasi tahap 12 belum pernah dijalankan:
--
--   alter table pendaftaran add constraint pendaftaran_nim_unique unique (nim);
-- =========================================================
