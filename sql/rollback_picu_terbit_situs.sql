-- Membatalkan picu terbit otomatis. Aman dijalankan kapan saja; data berita tidak tersentuh.
drop trigger if exists picu_terbit_berita_tambah_hapus on public.berita;
drop trigger if exists picu_terbit_berita_ubah on public.berita;
drop function if exists public.picu_terbit_situs();
-- Setelah ini, hapus juga rahasia `github_token` di Supabase (Vault) dan cabut tokennya di GitHub.
