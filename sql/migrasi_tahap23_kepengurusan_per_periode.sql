-- =====================================================================
-- Tahap 22: Kepengurusan per periode, tersambung ke data anggota
--   Sebelumnya pengurus adalah baris terpisah di tabel anggota (kategori = 'Pengurus')
--   dan tidak tersambung ke baris anggotanya. Tahap ini menambah tabel
--   `kepengurusan`: satu baris = satu jabatan seseorang pada satu periode.
--   Dari tabel ini, data anggota bisa menampilkan "Pengurus aktif, divisi, jabatan",
--   dan riwayat periode (2024/2025, 2025/2026, ...) tersimpan.
--
--   Dampak:
--   - MENAMBAH dua tabel baru. Tabel anggota tidak dihapus atau diubah strukturnya.
--   - Baris lama kategori 'Pengurus' dibiarkan utuh sebagai arsip (tidak dihapus).
--     Situs versi baru tidak lagi membacanya.
--   - Pengurus lama yang namanya TIDAK ditemukan di data anggota dibuatkan baris
--     anggota baru (NIM dan angkatan kosong; lengkapi di Dashboard > Anggota).
--   Rollback: sql/rollback_tahap22.sql
--
--   Cara pakai: Supabase > SQL Editor > New query.
--   Jalankan LANGKAH A dulu (hanya membaca), lihat hasilnya, lalu LANGKAH B.
-- =====================================================================


-- ---------------------------------------------------------------------
-- LANGKAH A (hanya membaca, tidak mengubah apa pun)
-- Kolom "cocok_dengan_anggota" kosong = pengurus itu akan dibuatkan baris anggota baru.
-- Kolom "jumlah_nama_sama" lebih dari 1 = ada anggota bernama sama; dipilih yang punya NIM.
-- ---------------------------------------------------------------------
select
  p.nama as nama_pengurus,
  p.jabatan,
  p.divisi,
  p.status,
  (select a.nama || coalesce(' (' || a.nim || ')', '')
     from public.anggota a
    where a.kategori = 'Anggota'
      and lower(regexp_replace(trim(a.nama), '\s+', ' ', 'g')) = lower(regexp_replace(trim(p.nama), '\s+', ' ', 'g'))
    order by (a.nim is not null) desc, a.created_at
    limit 1) as cocok_dengan_anggota,
  (select count(*)
     from public.anggota a
    where a.kategori = 'Anggota'
      and lower(regexp_replace(trim(a.nama), '\s+', ' ', 'g')) = lower(regexp_replace(trim(p.nama), '\s+', ' ', 'g'))) as jumlah_nama_sama
from public.anggota p
where p.kategori = 'Pengurus'
order by p.urutan nulls last, p.nama;


-- ---------------------------------------------------------------------
-- LANGKAH B (mengubah database; jalankan setelah Langkah A terlihat wajar)
-- ---------------------------------------------------------------------

create table if not exists public.kepengurusan (
  id uuid primary key default gen_random_uuid(),
  anggota_id uuid not null references public.anggota (id) on delete cascade,
  periode text not null check (periode ~ '^\d{4}/\d{4}$'),
  jabatan text not null check (char_length(jabatan) between 1 and 120),
  divisi text not null check (char_length(divisi) between 1 and 120),
  urutan integer,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  constraint kepengurusan_unik unique (anggota_id, periode, divisi, jabatan)
);

create index if not exists kepengurusan_anggota_idx on public.kepengurusan (anggota_id);
create index if not exists kepengurusan_periode_idx on public.kepengurusan (periode, urutan);

alter table public.kepengurusan enable row level security;

drop policy if exists "Publik bisa lihat kepengurusan" on public.kepengurusan;
create policy "Publik bisa lihat kepengurusan" on public.kepengurusan
  for select using (true);

drop policy if exists "Admin kelola kepengurusan" on public.kepengurusan;
create policy "Admin kelola kepengurusan" on public.kepengurusan
  using (public.is_admin()) with check (public.is_admin());

-- Publik hanya boleh membaca; tidak ada INSERT/UPDATE/DELETE/TRUNCATE untuk anon.
revoke all on table public.kepengurusan from anon, authenticated;
grant select on table public.kepengurusan to anon;
grant select, insert, update, delete on table public.kepengurusan to authenticated;

-- Catatan baris anggota yang dibuat otomatis oleh migrasi ini, supaya rollback tahu apa yang dihapus.
create table if not exists public.migrasi22_anggota_baru (
  anggota_id uuid primary key
);
alter table public.migrasi22_anggota_baru enable row level security;
revoke all on table public.migrasi22_anggota_baru from anon, authenticated;

-- Pindahkan data pengurus lama. Aman dijalankan ulang: pasangan yang sudah ada dilewati.
do $$
declare
  v_periode text;
  r record;
  v_anggota uuid;
begin
  select periode_kepengurusan into v_periode from public.pengaturan limit 1;
  if v_periode is null or v_periode !~ '^\d{4}/\d{4}$' then
    v_periode := '2025/2026';
  end if;

  for r in
    select * from public.anggota where kategori = 'Pengurus' order by urutan nulls last, created_at
  loop
    v_anggota := null;

    select a.id into v_anggota
      from public.anggota a
     where a.kategori = 'Anggota'
       and lower(regexp_replace(trim(a.nama), '\s+', ' ', 'g')) = lower(regexp_replace(trim(r.nama), '\s+', ' ', 'g'))
     order by (a.nim is not null) desc, a.created_at
     limit 1;

    if v_anggota is null then
      insert into public.anggota (nama, status, kategori, foto_url)
      values (trim(r.nama), r.status, 'Anggota', r.foto_url)
      returning id into v_anggota;
      insert into public.migrasi22_anggota_baru (anggota_id) values (v_anggota);
    else
      -- Foto pengurus dipakai bila anggota belum punya foto.
      update public.anggota set foto_url = r.foto_url
       where id = v_anggota and foto_url is null and r.foto_url is not null;
    end if;

    insert into public.kepengurusan (anggota_id, periode, jabatan, divisi, urutan, aktif)
    values (
      v_anggota,
      v_periode,
      coalesce(nullif(trim(r.jabatan), ''), 'Pengurus'),
      coalesce(nullif(trim(r.divisi), ''), 'Lainnya'),
      r.urutan,
      r.status = 'Aktif'
    )
    on conflict on constraint kepengurusan_unik do nothing;
  end loop;
end $$;

-- Pemeriksaan: jumlah baris kepengurusan hasil migrasi dan anggota baru yang dibuat.
select
  (select count(*) from public.kepengurusan) as baris_kepengurusan,
  (select count(*) from public.migrasi22_anggota_baru) as anggota_baru_dibuat;
