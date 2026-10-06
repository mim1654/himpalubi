-- =========================================================
-- CADANGAN SEBELUM TAHAP 13 — jalankan SEKALI sebelum migrasi tahap 13
-- Menyalin isi tabel + definisi fungsi/policy yang akan diubah ke schema "cadangan".
-- Tidak mengubah apa pun di schema public. Aman dijalankan berulang
-- (salinan yang sudah ada tidak ditimpa).
--
-- Catatan: ini melindungi dari kesalahan migrasi, BUKAN dari hilangnya project.
-- Untuk cadangan penuh, ekspor juga tiap tabel ke CSV lewat
-- Supabase > Table Editor > (pilih tabel) > Export.
-- Jalankan di: Supabase > SQL Editor > New query > Run
-- =========================================================

create schema if not exists cadangan;

do $$
declare t text;
begin
  foreach t in array array[
    'berita','anggota','galeri','program_kerja','pengaturan','faq','testimoni',
    'pendaftaran','admin_users','admin_undangan','admin_activity_log'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('create table if not exists cadangan.%I as table public.%I', t || '_sebelum_t13', t);
      execute format('alter table cadangan.%I enable row level security', t || '_sebelum_t13');
    end if;
  end loop;
end $$;

create table if not exists cadangan.definisi_sebelum_t13 as
  select 'fungsi'::text as jenis, 'cek_undangan_admin'::text as nama,
         pg_get_functiondef('public.cek_undangan_admin'::regproc) as isi
  union all
  select 'policy', tablename || ' / ' || policyname,
         format('cmd=%s roles=%s using=%s check=%s', cmd, roles, coalesce(qual, '-'), coalesce(with_check, '-'))
  from pg_policies
  where schemaname = 'public' and tablename in ('pendaftaran', 'admin_undangan', 'admin_users');
alter table cadangan.definisi_sebelum_t13 enable row level security;

-- Cek hasil: harus menampilkan jumlah baris tiap salinan.
select table_name,
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from cadangan.%I', table_name), false, true, '')))[1]::text as jumlah_baris
from information_schema.tables
where table_schema = 'cadangan'
order by table_name;
