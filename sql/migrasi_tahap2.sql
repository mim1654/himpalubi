-- =========================================================
-- MIGRASI TAHAP 2 — Kolom "Urutan" untuk Struktur Organisasi
-- Aman dijalankan di database yang sudah berjalan.
-- Jalankan di: Supabase > SQL Editor > New query > Run
-- =========================================================

alter table anggota add column if not exists urutan int;
-- urutan: angka kecil tampil lebih dulu (mis. Ketua Umum = 1, Wakil = 2, dst).
-- Boleh dikosongkan; yang kosong akan ditampilkan paling akhir, diurutkan nama.
