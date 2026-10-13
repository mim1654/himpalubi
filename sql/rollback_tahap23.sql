-- Rollback tahap 22: menghapus tabel kepengurusan (termasuk riwayat periode yang sudah diisi)
-- dan baris anggota yang dibuat otomatis oleh migrasi tahap 22.
-- Baris lama kategori 'Pengurus' tidak pernah diubah, jadi situs versi lama kembali berfungsi.
-- Pasang kembali file situs versi sebelumnya sebelum atau sesudah menjalankan ini.

delete from public.anggota
 where id in (select anggota_id from public.migrasi22_anggota_baru);

drop table if exists public.kepengurusan;
drop table if exists public.migrasi22_anggota_baru;

-- Bila Langkah D (indeks NIM unik) pernah dijalankan:
drop index if exists public.anggota_nim_unik;
