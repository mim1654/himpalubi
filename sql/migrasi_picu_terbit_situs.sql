-- =====================================================================
-- PICU TERBIT OTOMATIS: saat berita/kegiatan ditambah, diubah, atau dihapus,
-- database meminta GitHub menjalankan workflow "Terbitkan situs".
--
-- DAMPAK: menambah 1 fungsi + 2 pemicu (trigger) pada tabel `berita`.
--   Data berita TIDAK diubah. Bila pemanggilan GitHub gagal, penyimpanan berita
--   tetap berhasil (kegagalan diabaikan). Tanpa token, fungsi diam saja.
-- SYARAT: ekstensi pg_net aktif, dan rahasia bernama `github_token` sudah dibuat
--   di Supabase Vault (lihat panduan). TOKEN TIDAK BOLEH ditulis di file ini.
-- BATAL: jalankan sql/rollback_picu_terbit_situs.sql
-- =====================================================================

create extension if not exists pg_net;

create or replace function public.picu_terbit_situs()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  token text;
begin
  select decrypted_secret into token
  from vault.decrypted_secrets
  where name = 'github_token'
  limit 1;

  if token is null or token = '' then
    return null;  -- belum disiapkan: diam saja, jangan mengganggu simpan berita
  end if;

  begin
    perform net.http_post(
      url     := 'https://api.github.com/repos/mim1654/himpalubi/actions/workflows/deploy.yml/dispatches',
      headers := jsonb_build_object(
                   'Authorization', 'Bearer ' || token,
                   'Accept', 'application/vnd.github+json',
                   'X-GitHub-Api-Version', '2022-11-28',
                   'User-Agent', 'supabase-himpalubi',
                   'Content-Type', 'application/json'),
      body    := jsonb_build_object('ref', 'main')
    );
  exception when others then
    null;  -- kegagalan memicu tidak boleh membatalkan penyimpanan berita
  end;

  return null;
end;
$$;

-- Hanya pemicu yang boleh memanggilnya, bukan pengunjung lewat API.
revoke all on function public.picu_terbit_situs() from public, anon, authenticated;

-- Tambah / hapus berita
drop trigger if exists picu_terbit_berita_tambah_hapus on public.berita;
create trigger picu_terbit_berita_tambah_hapus
  after insert or delete on public.berita
  for each statement execute function public.picu_terbit_situs();

-- Ubah berita: HANYA bila kolom yang tampil di halaman ikut diubah.
-- (Kolom `views` sengaja tidak dimasukkan: fungsi tambah_pembaca mengubahnya
--  setiap ada pengunjung, dan itu tidak boleh memicu penerbitan ulang.)
drop trigger if exists picu_terbit_berita_ubah on public.berita;
create trigger picu_terbit_berita_ubah
  after update of judul, isi, tanggal, penulis, foto_url, kategori on public.berita
  for each statement execute function public.picu_terbit_situs();
