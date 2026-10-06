-- =========================================================
-- MIGRASI TAHAP 13 — Keamanan: kode undangan admin & validasi pendaftaran
--
-- Memperbaiki dua celah:
--   1. Undangan admin bisa diambil alih orang lain yang tahu/menebak email
--      yang diundang. Sekarang pendaftar harus menyertakan KODE UNDANGAN
--      (yang hanya diketahui Admin Utama dan orang yang diundang).
--   2. Formulir pendaftaran anggota bisa dikirim dengan status "Diterima",
--      tanggal palsu, atau teks raksasa lewat API. Sekarang dibatasi.
--
-- Aman dijalankan di database yang sudah berjalan:
--   - Tidak menghapus atau mengubah data pendaftaran/anggota/berita/admin.
--   - Hanya MENAMBAH kolom "kode" di admin_undangan (undangan yang masih
--     menunggu otomatis diberi kode) dan MENGGANTI 1 fungsi + 1 policy.
--   - Berjalan dalam 1 transaksi: gagal di tengah = tidak ada yang berubah.
--   - Bisa dijalankan berulang.
--
-- URUTAN: (1) jalankan sql/cadangan_sebelum_tahap13.sql
--         (2) deploy kode terbaru (admin/daftar.html, js/admin.js, dst.) ke GitHub Pages
--         (3) baru jalankan file ini
-- Pembatalan: sql/rollback_tahap13.sql
-- Jalankan di: Supabase > SQL Editor > New query > Run
-- =========================================================

begin;

-- 1. Kode undangan ---------------------------------------------------
alter table admin_undangan add column if not exists kode text;

update admin_undangan
set kode = substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)
where kode is null;

alter table admin_undangan
  alter column kode set default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
alter table admin_undangan alter column kode set not null;

-- 2. Trigger undangan: admin hanya diberikan jika email DAN kode cocok ---
create or replace function public.cek_undangan_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kode text;
begin
  select kode into v_kode
  from admin_undangan
  where lower(email) = lower(new.email);

  if v_kode is not null
     and lower(v_kode) = lower(btrim(coalesce(new.raw_user_meta_data ->> 'kode_undangan', ''))) then

    insert into admin_users (id, email) values (new.id, new.email)
    on conflict (id) do nothing;

    delete from admin_undangan where lower(email) = lower(new.email);

    -- Email dianggap terkonfirmasi HANYA untuk pendaftar dengan kode yang benar.
    update auth.users set email_confirmed_at = now()
    where id = new.id and email_confirmed_at is null;
  end if;

  return new;
end;
$$;

-- (trigger on_auth_user_created_cek_undangan dari tahap 4 tetap dipakai, tidak diubah)

-- 3. Pendaftaran anggota: batasi isi kiriman publik -----------------
drop policy if exists "Publik bisa mengirim pendaftaran" on pendaftaran;
create policy "Publik bisa mengirim pendaftaran" on pendaftaran
  for insert
  with check (
    status = 'Menunggu'
    and char_length(btrim(nama)) between 1 and 100
    and char_length(coalesce(nim, '')) <= 20
    and char_length(coalesce(program_studi, '')) <= 100
    and char_length(coalesce(angkatan, '')) <= 10
    and char_length(coalesce(tempat_lahir, '')) <= 100
    and char_length(coalesce(no_wa, '')) <= 20
    and char_length(coalesce(email, '')) <= 254
    and char_length(coalesce(alasan, '')) <= 2000
    and created_at >= now() - interval '10 minutes'
    and created_at <= now() + interval '1 minute'
  );

commit;
